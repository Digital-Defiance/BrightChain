[![Codacy Badge](https://app.codacy.com/project/badge/Grade/e3f269c473254e0aa9d8f49acb0686ac)](https://app.codacy.com/gh/Digital-Defiance/BrightChain/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

# BrightChain

This is the repository containing code for the pre-alpha research concept called BrightChain, based in part on the [Owner Free Filesystem](https://en.wikipedia.org/wiki/OFFSystem). BrightChain was conceived before IPFS was created and has been started and re-started several times over the last decade. It started out in C# and is now a Node/TypeScript project. You'll notice many similarities with IPFS as well as [Prometheus](https://github.com/Prometheus-SCN).

Currently the repository is an NX monorepo with only one project, "brightchain-lib" which contains the core BrightChain functionality that will be used by the to-be-created brightchain node application and quorum application.

The repository is still undergoing development and although data integrity has been verified at the block level including the XOR functionality, work is in progress on developing the more complex block generation, whitening, and reconstruction phases.

The code for authentication using BIP39/32 and SECP256k1 including ECIES encryption using those user keys has been implemented and tested through unit tests.

Future development includes completing the block generation and recovery processes as well as implementing systems for voting and for anonymous feedback submission.

BrightChain proposes a feature called "Brokered Anonymity" where activities can be conducted anonymously with identity information removed but encrypted and held aside only able to be reconstructed by a majority of members in the quorum in the event of a FISA warrant or other legal process- otherwise if the digital statute of limitations expires, the identifying information is lost forever and the anonymity is preserved.

The quorum will be an important aspect of BrightChain and current development includes methods for sealing and unsealing documents amongst groups of users with the ability to require that only a certain percentage of the original users be required to unseal. Much of the Quorum work is still in the future as well.

There is also code in place for voting with [Paillier](https://en.wikipedia.org/wiki/Paillier_cryptosystem) encryption.

## Documentation/Overview

- See [BrightChain Summary](./docs/BrightChain Summary.md) for a high level overview of the BrightChain system.
- See [Brightchain Writeup](./docs/Brightchain Writeup.md) for a more detailed overview of the BrightChain system.

## Development

Prerequisites:
    - optional: Docker Desktop
    - If you opt to run the code locally instead of Docker Desktop using the DevContainer, you'll need NodeJS 20 or higher installed. Otherwise it will be installed into the container for you.

Steps:
  - Clone the repository.
  - Open the repository in VSCode.
  - If you're using the Dev Container:
    - Install the Dev Container extension if required and you intend to use the Dev Container.
    - Open the command palette and select "Remote-Containers: Reopen in Container" to open the Dev Container.
  - Open a terminal in VSCode and run yarn in the root of the repository and in the brightchain-lib project.
  - npx nx test brightchain-lib to run the unit tests.

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ **This workspace has been generated by [Nx, a Smart, fast and extensible build system.](https://nx.dev)** ✨

## Generate code

If you happen to use Nx plugins, you can leverage code generators that might come with it.

Run `nx list` to get a list of available plugins and whether they have generators. Then run `nx list <plugin-name>` to see what generators are available.

Learn more about [Nx generators on the docs](https://nx.dev/plugin-features/use-code-generators).

## Running tasks

To execute tasks with Nx use the following syntax:

```
nx <target> <project> <...options>
```

You can also run multiple targets:

```
nx run-many -t <target1> <target2>
```

..or add `-p` to filter specific projects

```
nx run-many -t <target1> <target2> -p <proj1> <proj2>
```

Targets can be defined in the `package.json` or `projects.json`. Learn more [in the docs](https://nx.dev/core-features/run-tasks).

## Want better Editor Integration?

Have a look at the [Nx Console extensions](https://nx.dev/nx-console). It provides autocomplete support, a UI for exploring and running tasks & generators, and more! Available for VSCode, IntelliJ and comes with a LSP for Vim users.

## Ready to deploy?

Just run `nx build demoapp` to build the application. The build artifacts will be stored in the `dist/` directory, ready to be deployed.

## Set up CI!

Nx comes with local caching already built-in (check your `nx.json`). On CI you might want to go a step further.

- [Set up remote caching](https://nx.dev/core-features/share-your-cache)
- [Set up task distribution across multiple machines](https://nx.dev/nx-cloud/features/distribute-task-execution)
- [Learn more how to setup CI](https://nx.dev/recipes/ci)

## Connect with us!

- [Join the community](https://nx.dev/community)
- [Subscribe to the Nx Youtube Channel](https://www.youtube.com/@nxdevtools)
- [Follow us on Twitter](https://twitter.com/nxdevtools)
