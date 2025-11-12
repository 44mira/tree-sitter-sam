/**
 * @file A scripting language focused on function and language composition.
 * @author Legolas Tyrael Lada <legolaslada@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const OPERATOR_PRECEDENCE = [
  ["**", "binary_exp"],
  ["*", "binary_times"],
  ["/", "binary_times"],
  ["%", "binary_times"],
  ["+", "binary_plus"],
  ["-", "binary_plus"],
  ["<", "binary_compare"],
  ["<=", "binary_compare"],
  [">", "binary_compare"],
  [">=", "binary_compare"],
  ["==", "binary_compare"],
  ["!=", "binary_compare"],
];

module.exports = grammar({
  name: "sam",

  supertypes: ($) => [$.statement, $.expression, $.declaration],

  word: ($) => $.identifier,

  extras: ($) => [$.comment, /\s/],

  reserved: {
    global: ($) => ["return", "let", "if", "else", "for", "in"],
  },

  precedences: ($) => [
    [
      "attr_access",
      "call",
      "unary_op",
      "binary_exp",
      "binary_times",
      "binary_plus",
      "binary_compare",
      $.lambda_expression,
    ],
    ["assign"],
    ["declaration"],
  ],

  rules: {
    source_file: ($) => seq(optional($.interfaces), repeat($.statement)),

    interfaces: ($) => repeat1($.interface),

    interface: ($) =>
      seq(
        "interface",
        field("path", $.string),
        "load",
        field("module", $.identifier),
        $._semicolon,
      ),

    statement: ($) =>
      choice(
        $.expression_statement,
        $.declaration,
        $.assignment,
        $.return_statement,
      ),

    expression_statement: ($) => seq($.expression, $._semicolon),

    expression: ($) =>
      choice(
        $.identifier,
        $.nested_identifier,
        $.literal,
        $.binary_expression,
        $.unary_expression,
        $.lambda_expression,
        $.call_expression,
        $.array_access_expression,
        $.array_expression,
        $.if_expression,
        $.for_expression,
      ),

    declaration: ($) => choice($.variable_declaration),

    variable_declaration: ($) =>
      seq("let", commaSep1($.variable_declarator), $._semicolon),

    variable_declarator: ($) =>
      seq(
        field("variable", choice($.identifier, $.array_access_expression)),
        optional($._initializer),
      ),

    assignment: ($) =>
      prec.right(
        "assign",
        seq(
          field("lhs", $.identifier),
          "=",
          field("rhs", $.expression),
          $._semicolon,
        ),
      ),

    _initializer: ($) => seq("=", field("value", $.expression)),

    // can't start with number
    identifier: (_) => token(/[_a-zA-Z]+[_a-zA-Z0-9]*/),

    literal: ($) => choice($.number, $.string),

    binary_expression: ($) =>
      choice(
        ...OPERATOR_PRECEDENCE.map(([operator, precedence, associativity]) =>
          (associativity === "right" ? prec.right : prec.left)(
            precedence,
            seq(
              field("left", $.expression),
              field("operator", operator),
              field("right", $.expression),
            ),
          ),
        ),
      ),

    unary_expression: ($) =>
      prec.left(
        "unary_op",
        seq(
          field("operator", choice("!", "-", "+")),
          field("argument", $.expression),
        ),
      ),

    lambda_expression: ($) =>
      seq(
        field("parameters", $.parameters),
        "=>",
        field("body", choice($.expression, $.statement_block)),
      ),

    parameters: ($) => seq("(", commaSep($.identifier), ")"),

    statement_block: ($) => seq("{", repeat($.statement), "}"),

    return_statement: ($) =>
      seq("return", optional($.expression), $._semicolon),

    call_expression: ($) =>
      prec(
        "call",
        seq(field("function", $.expression), field("arguments", $.arguments)),
      ),

    arguments: ($) => seq("(", commaSep($.expression), ")"),

    string: ($) =>
      choice(
        seq(
          '"',
          repeat(
            choice(
              alias($.unescaped_double_string_fragment, $.string_fragment),
              $.escape_sequence,
            ),
          ),
          '"',
        ),
        seq(
          "'",
          repeat(
            choice(
              alias($.unescaped_single_string_fragment, $.string_fragment),
              $.escape_sequence,
            ),
          ),
          "'",
        ),
      ),

    // Workaround to https://github.com/tree-sitter/tree-sitter/issues/1156
    // We give names to the token() constructs containing a regexp
    // so as to obtain a node in the CST.
    //
    unescaped_double_string_fragment: (_) =>
      token.immediate(prec(1, /[^"\\\r\n]+/)),

    // same here
    unescaped_single_string_fragment: (_) =>
      token.immediate(prec(1, /[^'\\\r\n]+/)),

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /u\{[0-9a-fA-F]+\}/,
            /[\r?][\n\u2028\u2029]/,
          ),
        ),
      ),

    number: (_) => {
      const decimalDigits = /\d(_?\d)*/;
      const signedInteger = seq(optional(choice("-", "+")), decimalDigits);
      const exponentPart = seq(choice("e", "E"), signedInteger);

      const binaryLiteral = seq(choice("0b", "0B"), /[0-1](_?[0-1])*/);
      const octalLiteral = seq(choice("0o", "0O"), /[0-7](_?[0-7])*/);
      const hexLiteral = seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/);

      const decimalIntegerLiteral = choice(
        "0",
        seq(
          optional("0"),
          /[1-9]/,
          optional(seq(optional("_"), decimalDigits)),
        ),
      );

      const decimalLiteral = choice(
        seq(
          decimalIntegerLiteral,
          ".",
          optional(decimalDigits),
          optional(exponentPart),
        ),
        seq(".", decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, exponentPart),
        decimalDigits,
      );

      return token(
        choice(hexLiteral, decimalLiteral, binaryLiteral, octalLiteral),
      );
    },

    array_access_expression: ($) =>
      seq(
        choice(
          field("array", $.identifier),
          field("array_expression", $.array_expression),
        ),
        "[",
        field("index", $.expression),
        "]",
      ),

    array_expression: ($) => seq("[", commaSep($.expression), "]"),

    if_expression: ($) =>
      seq(
        "if",
        "(",
        field("condition", $.expression),
        ")",
        field("consequence", $.statement_block),
        optional(
          seq(
            "else",
            field("else", choice($.statement_block, $.if_expression)),
          ),
        ),
      ),

    for_expression: ($) =>
      seq(
        "for",
        seq(
          field("variable", $.identifier),
          "in",
          field("iterable", $.expression),
        ),
        field("body", $.statement_block),
      ),

    nested_identifier: ($) =>
      prec(
        "attr_access",
        seq(field("parent", $.expression), ".", field("name", $.identifier)),
      ),

    comment: (_) => token(seq("//", /[^\r\n]*/)),
    _semicolon: (_) => /;/,
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to match zero or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {Rule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
