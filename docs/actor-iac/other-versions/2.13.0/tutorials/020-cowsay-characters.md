---
id: cowsay-characters
title: Cowsay Characters
sidebar_position: 20
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

actor-IaC displays cowsay-format ASCII art in log output to clearly mark the beginning of each step.
You can change the character with the `--cowfile` option.

```bash
./actor_iac.java run -w workflows/main-hello.yaml -i inventory.ini -g local --cowfile tux
```

actor-IaC uses the [ricksbrown/cowsay](https://github.com/ricksbrown/cowsay) Java library for its cowsay functionality.


## Available Cowfile List

44 cowfiles are available:

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

To check the list via CLI, execute the following command.

```bash
./actor_iac.java run --cowfile list
```


## Character Examples

### tux (Linux Penguin)

The Linux mascot character, perfect for server work.

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

A prehistoric character for dinosaur lovers.

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

Perfect for workflows that progress steadily.

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

A simple and easy-to-see character.

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

A character for cat lovers.

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
