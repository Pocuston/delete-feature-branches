# Delete feature branches script

Script generates HTML table of obsolete remote feature branches which are older than one month,
so they are probably unused and should be deleted.

Script expects GIT working directory as the only parameter.

Script also outputs remote branch delete command for every branch listed in table 
(but it does not actually run the commands).

Example usage:

```
npm install
node main.js "c:\work\my_project"
```

Output:
```
branches.html
```