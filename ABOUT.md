# About

VTOLVR Polyglot was created purely because I wanted to work on a Greek loc file for VTOLVR and after a quick glance on the Discord server, I noticed that there isn't any official way to do it. The community can just create the loc files (CSV) and share them around. 

To me this isn't optimal for both the community but for the game too, having a common source/hub of all the translations is in practice much more convinient!

So VTOLVR Polyglot is born. 

## Why did I create my own custom JSON schema instead of using CSVs like VTOLVR?

Well for starters, a CSV file is very messy to edit raw. You'd need to import to a spreadsheet editor or another software to edit it in an environment that helps you not mess up. On top of that, Bahamuto has created multiple CSV files for each different kind of localization (I assume he loads them per-scene) which means that you'd need to edit multiple files as well. 

A custom JSON schema solves these issues because 1) We can specifically define what kind of inputs are expected for each field, 2) It can be expanded to look pretty and be human friendly and 3) It allows for much easier future expansion. 

Additionally, for some reason the game right now uses some weird keys for the CSV columns, so the custom schema makes it much more understandable and readable. 

Do note, to allow for VTOL to actually utilize the translations, I created a little script that takes any language JSON file and converts it into a VTOLVR compatible CSV. You can then add these to the loc folder in VTOL and enjoy.

## Could VTOLVR include these translations by default?

In theory? Yeah. That's one of the reasons I created the previously mentioned script too, so that they can just be drag-dropped into the core game files and shipped with Steam. If that's something that Bahamuto wants to do (baha pls) that's up to him. 

PS: I am looking into potentially adding an attributions file if Baha wants to attribute community made translations in the game somehow - again up to him though.
