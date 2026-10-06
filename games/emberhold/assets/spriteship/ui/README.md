# Emberhold Command Interface — godot UI Pack

This archive pins component revisions, their source artwork, configuration, fonts and license notices. Source SVGs and PNG renditions are the same component, not duplicate generated items. Keep ui-pack.json contentVersion for the existing SpriteShip plan_sync workflow, along with the engine, selection and local folder. Project style changes never regenerate these saved revisions; adoption into an existing pack is explicit. UI placement in SpriteShip Game Preview or Map Editor is not supported.

## Use

Serve this directory on local HTTP and open preview.html. Supply Phaser 3.90 in your own app, import UiPackScene from phaser-ui-example.js and call scene.setComponent(componentId, {value:0.5, content:'Your dialogue', width:640, height:240}). Values and layout are free local operations. For Godot, place the extracted folder under res:// and use SpriteShipUi.build(component, basePath). For Unity, add SpriteShipUi.cs, load ui-pack.json using your JSON adapter and use CreatePanel/CreateBar with the pinned PNGs/fonts and metadata.

Nine-slice corners retain their original pixel sizes. Text remains engine-rendered; this export does not implement dialogue branching, inventory logic or gameplay targeting. Ground headings turn within the ground plane about the saved anchor; actor/screen headings rotate in the screen plane. Preserve alreadyProjected: painted ground sources are normalized and reprojected for an affine approximation, with zero heading preserving the original proportions. Painted lighting and depth do not change. The browser renderer returns an expanded width/height and an anchor in canvas pixels; use that returned anchor when attaching the output to a character instead of assuming the unrotated artwork dimensions. Source files and saved dimensions remain unchanged.

## Coverage and limitations

- Native adapter included; engine execution of this UI Pack is NOT TESTED until the corresponding native release test passes.
- Native examples cover continuous masked bars and stretch nine-slice panels; tiled borders, arbitrary state/composition controls, title regions and world placement need target-specific integration.

## Licensing

LICENSE.txt applies to generated artwork. Each font has its own included license notice; those font terms take precedence for that file. Uploaded content remains subject to its original rights.
