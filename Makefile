#!/usr/bin/env make
engine?=../engine.turbulenz

jslib=$(patsubst $(engine)/%,%,$(wildcard $(engine)/jslib/*.js))
webgl=$(patsubst $(engine)/%,%,$(wildcard $(engine)/jslib/webgl/*.js))
services=$(patsubst $(engine)/%,%,$(wildcard $(engine)/jslib/services/*.js))
protolib=$(patsubst $(engine)/%,%,$(wildcard $(engine)/protolib/*.js))

release_js=$(jslib) $(webgl) $(services) $(protolib)
debug_js=$(addprefix debug/,$(release_js))

all: $(release_js) $(debug_js)

clean:
	rm -r debug
	rm -r jslib
	rm -r protolib

$(release_js): %.js : $(engine)/%.js
	mkdir -p $(@D)
	maketzjs --no-inject --mode=canvas -o $@ --templatedir=. $<
	gsed -i -e '1d' -e '$$d' $@

$(debug_js): debug/%.js : $(engine)/%.js
	mkdir -p $(@D)
	cp $< $@
	dos2unix $@
