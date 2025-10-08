import XCTest
import SwiftTreeSitter
import TreeSitterSam

final class TreeSitterSamTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_sam())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Simple Algebraic Machine grammar")
    }
}
