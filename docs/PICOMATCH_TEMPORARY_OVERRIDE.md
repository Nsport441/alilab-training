# Temporary picomatch override

Frontend and MCP use the exact npm alias `@ryotsu/picomatch@4.0.7-a` for their development-only picomatch dependency. The official package still has no published fix for [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf). This fork changes the parser to avoid unsafe wildcard repetition and retains the original MIT license. The lockfiles pin the tarball and integrity. The package has no runtime dependencies or install hooks.

The fork is an interim dependency. Once the maintainers publish a patched release, resolve both lockfiles to the official patched package, remove the alias, and run the existing audits, tests and Runflare build.
