#!/usr/bin/env bash

tree-sitter generate
tree-sitter build --wasm
tree-sitter playground
