---
sidebar_position: 20
title: Cowsay Characters
---

# Cowsay Characters

actor-IaC displays workflow step execution status using cowsay-style ASCII art. The cowsay output marks the beginning of each step in the logs, making it easy for users to identify where each step starts when reviewing log output. Users can change the display character by specifying the `--cowfile` option.

actor-IaC uses the [ricksbrown/cowsay](https://github.com/ricksbrown/cowsay) Java library for cowsay functionality.

## Available Cowfiles

actor-IaC includes 44 cowfile characters.

```
beavis.zen       bud-frogs        bunny            cheese
cower            daemon           default          dragon
dragon-and-cow   elephant         elephant-in-snake eyes
flaming-sheep    ghostbusters     hellokitty       kiss
kitty            koala            kosh             luke-koala
meow             milk             moofasa          moose
mutilated        ren              satanic          sheep
skeleton         small            squirrel         stegosaurus
stimpy           supermilker      surgery          telebears
three-eyes       turkey           turtle           tux
udder            vader            vader-koala      www
```

Users can display the list of available cowfiles by running the following command:

```bash
./actor_iac.java run --cowfile list
```

## Usage

Users specify a character using the `--cowfile` or `-c` option.

```bash
./actor_iac.java run -d ./workflows -w main-hello -i inventory.ini -g local --cowfile tux
```

## Character Examples

### tux (Linux Penguin)

The tux character displays the Linux mascot, suitable for server administration tasks.

```
 ________________________
/ [workflow-name]        \
\ - states: ["0", "end"] /
 ------------------------
   \
    \
        .--.
       |o_o |
       |:_/ |
      //   \ \
     (|     | )
    /'\_   _/`\
    \___)=(___/
```

### stegosaurus (Stegosaurus)

The stegosaurus character displays a prehistoric dinosaur.

```
 ________________________
/ [workflow-name]        \
\ - states: ["0", "end"] /
 ------------------------
\                             .       .
 \                           / `.   .' "
  \                  .---.  <    > <    >  .---.
   \                 |    \  \ - ~ ~ - /  /    |
         _____          ..-~             ~-..-~
        |     |   \~~~\.'                    `./~~~/
       ---------   \__/                        \__/
      .'  O    \     /               /       \  "
     (_____,    `._.'               |         }  \/~~~/
      `----.          /       }     |        /    \__/
            `-.      |       /      |       /      `. ,~~|
                ~-.__|      /_ - ~ ^|      /- _      `..-'
                     |     /        |     /     ~-.     `-. _  _  _
                     |_____|        |_____|         ~ - . _ _ _ _ _>
```

### turtle (Turtle)

The turtle character suits workflows that proceed steadily and reliably.

```
 ________________________
/ [workflow-name]        \
\ - states: ["0", "end"] /
 ------------------------
    \                                  ___-------___
     \                             _-~~             ~~-_
      \                         _-~                    /~-_
             /^\__/^\         /~  \                   /    \
           /|  O|| O|        /      \_______________/        \
          | |___||__|      /       /                \          \
          |          \    /      /                    \          \
          |   (_______) /______/                        \_________ \
          |         / /         \                      /            \
           \         \^\\         \                  /               \     /
             \         ||           \______________/      _-_       //\__//
               \       ||------_-~~-_ ------------- \ --/~   ~\    || __/
                 ~-----||====/~     |==================|       |/~~~~~
                  (_(__/  ./     /                    \_\      \.
                         (_(___/                         \_____)_)
```

### elephant (Elephant)

The elephant character provides a simple and easy-to-read display.

```
 ________________________
/ [workflow-name]        \
\ - states: ["0", "end"] /
 ------------------------
 \     /\  ___  /\
  \   // \/   \/ \\
     ((    O O    ))
      \\ /     \ //
       \/  | |  \/
        |  | |  |
        |  | |  |
        |   o   |
        | |   | |
        |m|   |m|
```

### meow (Cat)

The meow character displays a cat for cat enthusiasts.

```
 ________________________
/ [workflow-name]        \
\ - states: ["0", "end"] /
 ------------------------
  \
   \ ,   _ ___.--'''`--''//-,-_--_.
      \`"' ` || \\ \ \\/ / // / ,-\\`,_
     /'`  \ \ || Y  | \|/ / // / - |__ `-,
    /@"\  ` \ `\ |  | ||/ // | \/  \  `-._`-,_.,
   /  _.-. `.-\,___/\ _/|_/_\_\/|_/ |     `-._._)
   `-'``/  /  |  // \__/\__  /  \__/ \
        `-'  /-\/  | -|   \__ \   |-' |
          __/\ / _/ \/ __,-'   ) ,' _|'
         (((__/(((_.' ((___..-'((__,'
```
