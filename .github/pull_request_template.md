<!--
## Pull Request template
-->
### Description
<!-- enter a description of your change here -->

### This is a 
<!-- Pick One -->
- [ ] Bug Fix
- [ ] Feature
- [ ] Documentation
- [ ] Other

## Checklists
#### Commit style
   <!-- Check all the following -->
   - [ ] Changes are on a branch with a descriptive name eg. `fix/missing-queue`, `docs/setup-guide`
   
   - [ ] Commits start with one of `feat:` `fix:` `docs:` `chore:` or similar
   
   - [ ] No excessive commits, eg: there should be no `fix:` commits for bugs that existed only on the PR branch (see [guide-to-interactive-rebasing](https://hackernoon.com/beginners-guide-to-interactive-rebasing-346a3f9c3a6d))

#### Protected files

The following files should not change unless they are directly a part of your change.
    <!-- Check any of the bellow files that have changed, add a reason for each if nessesary  -->
   - [ ] `yarn.lock` (unless package.json is also modified, then only the new/updated package should be changed here)
   
   - [ ] `package.json` (renovate bot should handle all routine updates)

   - [ ] `package-lock.json` (Should not exist as this project uses yarn)
   
   - [ ] `tsconfig.json` (only make it stricter, making it more lenient requires more discussion)
   
   - [ ] `tslint.json` (only make it stricter, making it more lenient requires more discussion)
