class_name SpriteShipUi
extends RefCounted

static func texture(revision: Dictionary, id: String, base: String) -> Texture2D:
    for artifact in revision.artifacts:
        if artifact.id == id:
            return load(base.path_join(artifact.url)) as Texture2D
    return null

static func build(component: Dictionary, base: String) -> Control:
    var revision: Dictionary = component.activeRevision
    var c: Dictionary = revision.configuration
    var root := Control.new()
    root.name = "SpriteShipUi"
    root.custom_minimum_size = Vector2(c.width, c.height)
    root.size = root.custom_minimum_size
    if c.has("fill") and revision.validation.capabilities.get("fill", {}).get("passed", false):
        var fill: Dictionary = c.fill
        var progress := TextureProgressBar.new()
        progress.name = "Fill"
        progress.min_value = 0
        progress.max_value = 1
        progress.step = 1.0 / max(1, int(fill.segments)) if fill.mode == "stepped" else 0.001
        progress.value = clampf(fill.value, 0, 1)
        progress.fill_mode = TextureProgressBar.FILL_RIGHT_TO_LEFT if fill.direction == "right-to-left" else TextureProgressBar.FILL_BOTTOM_TO_TOP if fill.direction == "bottom-to-top" else TextureProgressBar.FILL_LEFT_TO_RIGHT
        var mask_id: String = fill.get("maskArtifactId", "")
        if not mask_id.is_empty():
            var cropped := AtlasTexture.new()
            cropped.atlas = texture(revision, mask_id, base)
            cropped.region = Rect2(fill.bounds.x, fill.bounds.y, fill.bounds.width, fill.bounds.height)
            progress.texture_progress = cropped
            progress.position = Vector2(fill.bounds.x, fill.bounds.y)
            progress.size = Vector2(fill.bounds.width, fill.bounds.height)
        else:
            var white := Image.create(1, 1, false, Image.FORMAT_RGBA8)
            white.fill(Color.WHITE)
            progress.texture_progress = ImageTexture.create_from_image(white)
            progress.nine_patch_stretch = true
            progress.position = Vector2(fill.bounds.x, fill.bounds.y)
            progress.size = Vector2(fill.bounds.width, fill.bounds.height)
        progress.tint_progress = Color(fill.color)
        root.add_child(progress)
    for layer in c.layers:
        var image := texture(revision, layer.artifactId, base)
        if image == null:
            continue
        var node: Control
        var resize: Dictionary = c.get("panel", c.get("control", {}))
        if not resize.is_empty() and revision.validation.capabilities.get("resize", {}).get("passed", false):
            var panel := NinePatchRect.new()
            panel.texture = image
            var slices: Dictionary = resize.slices
            panel.patch_margin_left = int(slices.left)
            panel.patch_margin_right = int(slices.right)
            panel.patch_margin_top = int(slices.top)
            panel.patch_margin_bottom = int(slices.bottom)
            panel.axis_stretch_horizontal = NinePatchRect.AXIS_STRETCH_MODE_TILE if resize.edgeMode == "tile" else NinePatchRect.AXIS_STRETCH_MODE_STRETCH
            panel.axis_stretch_vertical = panel.axis_stretch_horizontal
            node = panel
        else:
            var picture := TextureRect.new()
            picture.texture = image
            picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
            picture.stretch_mode = TextureRect.STRETCH_SCALE
            node = picture
        root.add_child(node)
        if layer.get("placement", "foreground") == "background":
            var background_count: int = root.get_meta("background_count", 0)
            root.move_child(node, background_count)
            root.set_meta("background_count", background_count + 1)
        node.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
        node.modulate.a = layer.get("opacity", 1)
    if c.has("panel") and revision.validation.capabilities.get("text", {}).get("passed", false):
        var p: Dictionary = c.panel
        root.custom_minimum_size = Vector2(p.minimumWidth, p.minimumHeight)
        var text := Label.new()
        text.name = "Content"
        text.text = p.content
        text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
        text.clip_text = true
        text.add_theme_font_size_override("font_size", int(p.bodyFont.size))
        text.add_theme_color_override("font_color", Color(p.bodyFont.color))
        var manifest = JSON.parse_string(FileAccess.get_file_as_string(base.path_join("ui-pack.json")))
        for font in manifest.fonts:
            if font.id == p.bodyFont.fontId:
                text.add_theme_font_override("font", load(base.path_join(font.url)))
        root.add_child(text)
        text.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
        text.offset_left = p.padding.left
        text.offset_top = p.padding.top
        text.offset_right = -p.padding.right
        text.offset_bottom = -p.padding.bottom
    elif c.has("label"):
        var font: Dictionary = c.get("labelFont", revision.styleGuide.bodyFont)
        var text := Label.new()
        text.name = "Content"
        text.text = c.label
        text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        text.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
        text.add_theme_font_size_override("font_size", int(font.size))
        text.add_theme_color_override("font_color", Color(font.color))
        var manifest = JSON.parse_string(FileAccess.get_file_as_string(base.path_join("ui-pack.json")))
        for asset in manifest.fonts:
            if asset.id == font.fontId:
                text.add_theme_font_override("font", load(base.path_join(asset.url)))
        root.add_child(text)
        text.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
        var padding: Dictionary = c.get("control", {}).get("padding", {"left":8,"right":8,"top":4,"bottom":4})
        text.offset_left = padding.left
        text.offset_top = padding.top
        text.offset_right = -padding.right
        text.offset_bottom = -padding.bottom
    return root

static func set_value(component: Control, value: float) -> void:
    var fill := component.get_node_or_null("Fill") as TextureProgressBar
    if fill != null:
        fill.value = clampf(value, 0, 1)

static func set_content(component: Control, content: String) -> void:
    var label := component.get_node_or_null("Content") as Label
    if label != null:
        label.text = content
