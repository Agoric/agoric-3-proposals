# CoreEvalProposal to deploy a beta of Fast USDC

The `submission` permit and script are extracted from proposal 87 submitted to mainNet. (see `Makefile`)

Then the `oracles` property was manually modified to use these oracle that are in A3P history:

```diff
         oracles: {
-          "01node": "agoric1ym488t6j24x3ys3va3452ftx44lhs64rz8pu7h",
-          DSRV: "agoric17crpkfxarq658e9ddru2petrfr0fhjzvjfccq9",
-          SimplyStaking: "agoric1s5yawjgj6xcw4ea5r2x4cjrnkprmd0fcun2tyk",
+          GOV1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
+          GOV2: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
+          GOV3: 'agoric1ydzxwh6f893jvpaslmaz6l8j2ulup9a7x8qvvq',
         },
```

Matching bundles are available from:
https://github.com/Agoric/agoric-sdk/releases/tag/fast-usdc-beta-1 0303d15
