// This is generated by writeCoreEval; please edit!
/* eslint-disable */

const manifestBundleRef = {bundleID:"b1-d217fb17508ebe5c94e9ab432a9d6f5aea5fba810f7e5d7cc1785a6235e378e8eb117199624eb2f0061fc39126150d6f833617d0c2c26a979b36b0bb81d88a61"};
const getManifestCall = harden([
  "getManifestForPortfolio",
  {
    installKeys: {
      ymax0: {
        bundleID: "b1-1cfec33f0aea5488aefbbe6b861bf5211081ea139f1bc8bd03540c7b35d6dcb7342b5be675e183cbf2b9d3cd0f9098a2a5e4cf349ce56f11df33835d26d938d7",
      },
    },
    options: {
      slots: [],
      structure: {
        axelarConfig: {
          Arbitrum: {
            axelarId: "arbitrum-sepolia",
            chainInfo: {
              cctpDestinationDomain: 3,
              namespace: "eip155",
              reference: "421614",
            },
            contracts: {
              aavePool: "0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
              usdc: "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557",
            },
          },
          Avalanche: {
            axelarId: "Avalanche",
            chainInfo: {
              cctpDestinationDomain: 1,
              namespace: "eip155",
              reference: "43113",
            },
            contracts: {
              aavePool: "0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0",
              usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
            },
          },
          Binance: {
            axelarId: "binance",
            chainInfo: {
              namespace: "eip155",
              reference: "97",
            },
            contracts: {
              aavePool: "0x",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x",
              usdc: "0x",
            },
          },
          Ethereum: {
            axelarId: "ethereum-sepolia",
            chainInfo: {
              cctpDestinationDomain: 0,
              namespace: "eip155",
              reference: "11155111",
            },
            contracts: {
              aavePool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
              usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
            },
          },
          Fantom: {
            axelarId: "Fantom",
            chainInfo: {
              namespace: "eip155",
              reference: "4002",
            },
            contracts: {
              aavePool: "0x",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x",
              usdc: "0x",
            },
          },
          Optimism: {
            axelarId: "optimism-sepolia",
            chainInfo: {
              cctpDestinationDomain: 2,
              namespace: "eip155",
              reference: "11155420",
            },
            contracts: {
              aavePool: "0xb50201558B00496A145fE76f7424749556E326D8",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
              usdc: "0x4200000000000000000000000000000000000042",
            },
          },
          Polygon: {
            axelarId: "polygon-sepolia",
            chainInfo: {
              cctpDestinationDomain: 7,
              namespace: "eip155",
              reference: "80002",
            },
            contracts: {
              aavePool: "0x",
              compound: "0x",
              factory: "0x",
              tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
              usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            },
          },
        },
      },
    },
  },
]);
const customManifest = {
  startPortfolio: {
    brand: {},
    consume: {
      agoricNames: true,
      board: true,
      chainInfoPublished: true,
      chainStorage: true,
      chainTimerService: true,
      cosmosInterchainService: true,
      localchain: true,
      startUpgradable: true,
      zoe: true,
    },
    installation: {
      consume: {
        ymax0: true,
      },
    },
    instance: {
      produce: {
        ymax0: true,
      },
    },
    issuer: {
      consume: {
        BLD: true,
        PoC26: true,
        USDC: true,
      },
    },
    produce: {
      ymax0Kit: true,
    },
  },
};

// Make a behavior function and "export" it by way of script completion value.
// It is constructed by an anonymous invocation to ensure the absence of a global binding
// for makeCoreProposalBehavior, which may not be necessary but preserves behavior pre-dating
// https://github.com/Agoric/agoric-sdk/pull/8712 .
const behavior = (({
  manifestBundleRef,
  getManifestCall: [manifestGetterName, ...manifestGetterArgs],
  customManifest,
  E,
  log = console.info,
  customRestoreRef,
}) => {
  const { entries, fromEntries } = Object;

  /**
   * Given an object whose properties may be promise-valued, return a promise
   * for an analogous object in which each such value has been replaced with its
   * fulfillment.
   * This is a non-recursive form of endo `deeplyFulfilled`.
   *
   * @template T
   * @param {{[K in keyof T]: (T[K] | Promise<T[K]>)}} obj
   * @returns {Promise<T>}
   */
  const shallowlyFulfilled = async obj => {
    if (!obj) {
      return obj;
    }
    const awaitedEntries = await Promise.all(
      entries(obj).map(async ([key, valueP]) => {
        const value = await valueP;
        return [key, value];
      }),
    );
    return fromEntries(awaitedEntries);
  };

  const makeRestoreRef = (vatAdminSvc, zoe) => {
    /** @type {(ref: import\('./externalTypes.js').ManifestBundleRef) => Promise<Installation<unknown>>} */
    const defaultRestoreRef = async bundleRef => {
      // extract-proposal.js creates these records, and bundleName is
      // the optional name under which the bundle was installed into
      // config.bundles
      const bundleIdP =
        'bundleName' in bundleRef
          ? E(vatAdminSvc).getBundleIDByName(bundleRef.bundleName)
          : bundleRef.bundleID;
      const bundleID = await bundleIdP;
      const label = bundleID.slice(0, 8);
      return E(zoe).installBundleID(bundleID, label);
    };
    return defaultRestoreRef;
  };

  /** @param {ChainBootstrapSpace & BootstrapPowers & { evaluateBundleCap: any }} powers */
  const coreProposalBehavior = async powers => {
    // NOTE: `powers` is expected to match or be a superset of the above `permits` export,
    // which should therefore be kept in sync with this deconstruction code.
    // HOWEVER, do note that this function is invoked with at least the *union* of powers
    // required by individual moduleBehaviors declared by the manifest getter, which is
    // necessary so it can use `runModuleBehaviors` to provide the appropriate subset to
    // each one (see ./writeCoreEvalParts.js).
    // Handle `powers` with the requisite care.
    const {
      consume: { vatAdminSvc, zoe, agoricNamesAdmin },
      evaluateBundleCap,
      installation: { produce: produceInstallations },
      modules: {
        utils: { runModuleBehaviors },
      },
    } = powers;

    // Get the on-chain installation containing the manifest and behaviors.
    log('evaluateBundleCap', {
      manifestBundleRef,
      manifestGetterName,
      vatAdminSvc,
    });
    let bcapP;
    if ('bundleName' in manifestBundleRef) {
      bcapP = E(vatAdminSvc).getNamedBundleCap(manifestBundleRef.bundleName);
    } else if ('bundleID' in manifestBundleRef) {
      bcapP = E(vatAdminSvc).getBundleCap(manifestBundleRef.bundleID);
    } else {
      const keys = Reflect.ownKeys(manifestBundleRef).map(key =>
        typeof key === 'string' ? JSON.stringify(key) : String(key),
      );
      const keysStr = `[${keys.join(', ')}]`;
      throw Error(
        `bundleRef must have own bundleName or bundleID, missing in ${keysStr}`,
      );
    }
    const bundleCap = await bcapP;

    const proposalNS = await evaluateBundleCap(bundleCap);

    // Get the manifest and its metadata.
    log('execute', {
      manifestGetterName,
      bundleExports: Object.keys(proposalNS),
    });
    const restoreRef = customRestoreRef || makeRestoreRef(vatAdminSvc, zoe);
    const {
      manifest,
      options: rawOptions,
      installations: rawInstallations,
    } = await proposalNS[manifestGetterName](
      harden({ restoreRef }),
      ...manifestGetterArgs,
    );

    // Await promises in the returned options and installations records.
    const [options, installations] = await Promise.all(
      [rawOptions, rawInstallations].map(shallowlyFulfilled),
    );

    // Publish the installations for our dependencies.
    const installationEntries = entries(installations || {});
    if (installationEntries.length > 0) {
      const installAdmin = E(agoricNamesAdmin).lookupAdmin('installation');
      await Promise.all(
        installationEntries.map(([key, value]) => {
          produceInstallations[key].reset();
          produceInstallations[key].resolve(value);
          return E(installAdmin).update(key, value);
        }),
      );
    }

    // Evaluate the manifest.
    return runModuleBehaviors({
      // Remember that `powers` may be arbitrarily broad.
      allPowers: powers,
      behaviors: proposalNS,
      manifest: customManifest || manifest,
      makeConfig: (name, _permit) => {
        log('coreProposal:', name);
        return { options };
      },
    });
  };

  return coreProposalBehavior;
})({ manifestBundleRef, getManifestCall, customManifest, E });
behavior;
