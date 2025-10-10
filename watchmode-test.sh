#!/usr/bin/env bash

fd "**/*.txt" ./test/corpus/ --glob | entr -cr tree-sitter test
