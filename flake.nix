{
  description = "AresRPG nix flake";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        inputLock = (builtins.fromJSON (builtins.readFile ./package-lock.json));

        rewriteDep = package:
          package // (if package ? resolved then {
            resolved = "file://${
                pkgs.fetchurl {
                  url = package.resolved;
                  outputHashAlgo =
                    builtins.elemAt (builtins.split "-" package.integrity) 0;
                  outputHash =
                    builtins.elemAt (builtins.split "-" package.integrity) 2;
                }
              }";
          } else
            { }) // (if package ? dependencies then {
              dependencies = rewriteDeps package.dependencies;
            } else
              { });

        rewriteDeps = dependencies:
          builtins.mapAttrs (name: rewriteDep) dependencies;

        outputLock = builtins.toJSON ({
          lockfileVersion = 2;
          dependencies = rewriteDeps inputLock.dependencies;
        });

        # TODO: remove when flakes support submodules
        floor1 = pkgs.fetchFromGitHub {
          owner = "aresrpg";
          repo = "floor1";
          rev = "644a2e4206343ef6e989ccbb28c62a4d0a5d5fb0";
          sha256 = "WuKsDHpWmgJlqNCQ9Z5V75P5AF1w3cOIDbuMxQ/EGaw=";
        };

        nodeSources = pkgs.runCommand "node-sources" { } ''
          tar --no-same-owner --no-same-permissions -xf ${pkgs.nodejs-16_x.src}
          mv node-* $out
        '';

        cairo = pkgs.cairo.override {
          x11Support = false;
          gobjectSupport = false;
          pdfSupport = false;
        };

        pango = pkgs.pango.override {
          cairo = cairo;
          x11Support = false;
        };

        aresrpg = pkgs.stdenv.mkDerivation {
          name = "aresrpg";

          nativeBuildInputs =
            [ pkgs.nodejs-16_x cairo pango pkgs.python3 pkgs.pkg-config ];

          src = ./.;

          passAsFile = [ "packageLock" ];

          packageLock = outputLock;

          dontPatchShebangs = true;

          NO_UPDATE_NOTIFIER = true;

          installPhase = ''
            cp --no-preserve=mode -r $src $out
            cd $out

            cp $packageLockPath package-lock.json

            ln -s ${floor1} world/floor1

            npm ci --production --cache /tmp --build-from-source --nodedir=${nodeSources}

            rm package-lock.json node_modules/.package-lock.json
          '';
        };
      in {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs-16_x
            pkgs.libuuid
            pkgs.cairo
            pkgs.pango
            pkgs.libjpeg
            pkgs.giflib
            pkgs.librsvg
            pkgs.python3
            pkgs.pkg-config
          ];
        };

        dockerImage = pkgs.dockerTools.buildImage {
          name = "aresrpg";
          tag = "latest";

          config = {
            Cmd =
              [ "${pkgs.nodejs-slim-16_x}/bin/node" "${aresrpg}/src/index.js" ];
            ExposedPorts = {
              "25565/tcp" = { };
            } // (if (self ? rev) then { Label = "rev=${self.rev}"; } else { });
          };
        };
      });
}
