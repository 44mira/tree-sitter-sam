/**
 * @file A scripting language focused on function and language composition.
 * @author Legolas Tyrael Lada <legolaslada@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "sam",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
