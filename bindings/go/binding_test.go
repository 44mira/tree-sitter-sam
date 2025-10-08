package tree_sitter_sam_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_sam "github.com/44mira/tree-sitter-sam/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_sam.Language())
	if language == nil {
		t.Errorf("Error loading Simple Algebraic Machine grammar")
	}
}
