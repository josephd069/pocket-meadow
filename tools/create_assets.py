"""Original Pocket Meadow assets. Execute inside Blender through MCP."""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

PROJECT = Path(r'C:\Users\Josep\OneDrive\Documents\ChatGPT\SEG3502\pocket-meadow')
OUT = PROJECT / 'dist' / 'assets'
SOURCE = PROJECT / 'assets' / 'source'
if bpy.data.objects.get('Asset_Player'):
    raise RuntimeError('The asset kit is already open. Edit it in place, or regenerate in a fresh Blender process to preserve stable export names.')
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

def enum(owner, prop, wanted):
    values = [i.identifier for i in owner.bl_rna.properties[prop].enum_items]
    assert wanted in values, (prop, wanted, values)
    return wanted

scene = bpy.data.scenes.new('Pocket Meadow • Original Asset Kit')
bpy.context.window.scene = scene
collection = bpy.data.collections.new('COL_Export')
scene.collection.children.link(collection)
scene.unit_settings.system = enum(scene.unit_settings, 'system', 'METRIC')
scene.unit_settings.scale_length = 1

mat = bpy.data.materials.new('MAT_Meadow_VertexPalette')
mat.use_nodes = True
shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
shader.inputs['Roughness'].default_value = .82
colors = mat.node_tree.nodes.new('ShaderNodeVertexColor')
colors.layer_name = 'Color'
mat.node_tree.links.new(colors.outputs['Color'], shader.inputs['Base Color'])
palette = dict(green='4E8550', lime='9DBD64', darkgreen='386C48', bark='8A654A',
               cream='FFF0CB', blue='4E92B2', navy='304A54', gold='F5BE43',
               amber='D98B2E', skin='F2BB8E', coral='CF795D', stone='A4AAA0',
               stone_light='CBD0BD', brown='AB7A52', roof='527C72')

def linear(hex_value):
    rgb = [int(hex_value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)

def finish(obj, color, root):
    obj.name = 'SM_' + root.name.removeprefix('Asset_') + '_Part'
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    attribute = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    rgba = (*linear(palette.get(color,color)), 1)
    for item in attribute.data:
        item.color = rgba
    obj.parent = root
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def root(name):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    return obj

def box(parent, color, loc, size, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    if rot:
        obj.rotation_euler = rot
    return finish(obj,color,parent)

def ico(parent, color, loc, size, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc)
    obj = bpy.context.object
    obj.scale = size
    return finish(obj,color,parent)

def cone(parent, color, loc, bottom, top, height, sides=8, rotation=None):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=bottom, radius2=top, depth=height, location=loc)
    obj = bpy.context.object
    if rotation:
        obj.rotation_euler = rotation
    return finish(obj,color,parent)

def merge(parent, name):
    meshes = [o for o in parent.children if o.type == 'MESH']
    if not meshes:
        return
    deselect = next(i.identifier for i in bpy.ops.object.select_all.get_rna_type().properties['action'].enum_items if i.identifier == 'DESELECT')
    bpy.ops.object.select_all(action=deselect)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    # Collapse identical material slots after joining; preserve face vertex colours.
    for poly in result.data.polygons:
        poly.material_index = 0
        poly.use_smooth = False
    result.data.materials.clear()
    result.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

assets=[]
player=root('Asset_Player'); assets.append(player)
box(player,'blue',(0,0,.62),(.40,.30,.42))
box(player,'navy',(0,0,.43),(.35,.27,.14))
ico(player,'skin',(0,-.015,.96),(.205,.185,.22),2)
cone(player,'gold',(0,0,1.14),.24,.24,.07,12)
cone(player,'gold',(0,.005,1.205),.19,.14,.12,12)
box(player,'navy',(-.075,-.187,.99),(.038,.025,.046))
box(player,'navy',(.075,-.187,.99),(.038,.025,.046))
box(player,'coral',(0,-.191,.91),(.065,.018,.023))
box(player,'coral',(0,.20,.64),(.32,.16,.34))
for side in (-1,1):
    box(player,'cream',(side*.12,-.162,.65),(.04,.02,.34))
merge(player,'SM_Player_Body')
for side,label in ((-1,'L'),(1,'R')):
    leg=root('Part_Leg_'+label); leg.parent=player
    box(leg,'navy',(side*.105,0,-.15),(.14,.17,.31))
    box(leg,'brown',(side*.105,-.045,-.32),(.16,.26,.10))
    merge(leg,'SM_Player_Leg_'+label)
    leg.location.z=.40
    arm=root('Part_Arm_'+label); arm.parent=player
    box(arm,'blue',(side*.045,0,-.11),(.15,.23,.25))
    ico(arm,'skin',(side*.045,-.015,-.26),(.08,.085,.085))
    merge(arm,'SM_Player_Arm_'+label)
    arm.location=(side*.235,0,.76)

coin=root('Asset_Coin'); assets.append(coin)
cone(coin,'amber',(0,0,.32),.30,.30,.085,16,(math.pi/2,0,0))
for side in (-1,1):
    cone(coin,'gold',(0,side*.05,.32),.246,.246,.025,16,(math.pi/2,0,0))
    box(coin,'cream',(0,side*.068,.32),(.075,.02,.27))
merge(coin,'SM_Coin')

pine=root('Asset_Pine'); assets.append(pine)
cone(pine,'bark',(0,0,.62),.18,.13,1.24,8)
for color,z,r,h in (('darkgreen',1.05,1.02,1.35),('green',1.75,.84,1.3),('lime',2.43,.54,1.10)):
    cone(pine,color,(0,0,z),r,0,h,8)
merge(pine,'SM_Pine')

tree=root('Asset_Tree'); assets.append(tree)
cone(tree,'bark',(0,0,.95),.19,.12,1.9,7)
for color,loc,size in (('green',(0,0,2.07),(1.04,.93,.98)),('lime',(-.40,-.1,2.53),(.74,.71,.70)),('darkgreen',(.55,.1,2.05),(.75,.72,.78))):
    ico(tree,color,loc,size,1)
merge(tree,'SM_Tree')

rock=root('Asset_Rock'); assets.append(rock)
ico(rock,'stone',(0,0,.36),(.66,.52,.47),1)
ico(rock,'stone_light',(-.20,-.10,.52),(.33,.32,.27),1)
merge(rock,'SM_Rock')

crate=root('Asset_Crate'); assets.append(crate)
box(crate,'brown',(0,0,.37),(.72,.72,.74))
for x in (-.28,.28):
    for y in (-.37,.37):
        box(crate,'cream',(x,y,.37),(.08,.035,.76))
box(crate,'bark',(0,-.38,.37),(.68,.045,.08),(0,math.radians(38),0))
merge(crate,'SM_Crate')

flower=root('Asset_Flower'); assets.append(flower)
cone(flower,'darkgreen',(0,0,.17),.025,.018,.34,5)
ico(flower,'gold',(0,0,.36),(.07,.07,.055),1)
for angle in range(0,360,72):
    a=math.radians(angle)
    ico(flower,'cream',(math.cos(a)*.095,math.sin(a)*.095,.35),(.085,.075,.04),1)
merge(flower,'SM_Flower')

grass=root('Asset_Grass'); assets.append(grass)
for x,y,angle in ((-.09,0,-.24),(.03,.04,.16),(.10,-.03,-.1)):
    cone(grass,'lime',(x,y,.16),.055,0,.32,3,(angle,0,0))
merge(grass,'SM_Grass')

fence=root('Asset_Fence'); assets.append(fence)
for x in (-.85,0,.85):
    box(fence,'cream',(x,0,.50),(.12,.13,1))
    cone(fence,'cream',(x,0,1.07),.09,0,.16,4)
for z in (.33,.72):
    box(fence,'cream',(0,0,z),(1.90,.09,.10))
merge(fence,'SM_Fence')

cottage=root('Asset_Cottage'); assets.append(cottage)
profile=[(-1.3,0),(1.3,0),(1.3,1.7),(0,2.55),(-1.3,1.7)]
verts=[(x,y,z) for y in (-1,1) for x,z in profile]
faces=[tuple(range(5)),tuple(reversed(range(5,10)))]
faces += [(i,5+i,5+(i+1)%5,(i+1)%5) for i in range(5)]
mesh=bpy.data.meshes.new('Cottage_Shell'); mesh.from_pydata(verts,[],faces); mesh.update()
obj=bpy.data.objects.new('Cottage',mesh); collection.objects.link(obj)
finish(obj,'cream',cottage)
slope=math.atan2(.98,1.5)
for side in (-1,1):
    box(cottage,'roof',(side*.75,0,2.06),(math.hypot(1.5,.98)+.10,2.5,.13),(0,side*slope,0))
box(cottage,'bark',(-.42,-1.03,.61),(.70,.09,1.22))
box(cottage,'coral',(-.42,-1.09,.60),(.55,.04,1.1))
ico(cottage,'gold',(-.22,-1.14,.61),(.035,.025,.035))
box(cottage,'stone_light',(-.42,-1.30,.10),(1.0,.65,.20))
for x,y,z,side in ((.66,-1.04,1.02,False),(1.34,.20,1.04,True)):
    if side:
        box(cottage,'bark',(x,y,z),(.10,.67,.72)); box(cottage,'blue',(x+.06,y,z),(.03,.53,.58))
        box(cottage,'cream',(x+.08,y,z),(.03,.045,.60))
    else:
        box(cottage,'bark',(x,y,z),(.67,.10,.72)); box(cottage,'blue',(x,y-.06,z),(.53,.03,.58))
        box(cottage,'cream',(x,y-.08,z),(.045,.03,.60))
box(cottage,'coral',(.72,.40,2.41),(.30,.35,.80))
box(cottage,'bark',(.72,.40,2.84),(.40,.45,.10))
merge(cottage,'SM_Cottage')

# Audit original meshes before export. Every component is closed, flat-shaded,
# shares the palette material, and has applied object scale and rotation.
report={'blender':bpy.app.version_string,'unit':'metre','materials':1,'assets':{},'total_triangles':0}
for asset in assets:
    meshes=[o for o in asset.children_recursive if o.type=='MESH']
    tris=0; bad_edges=0
    for obj in meshes:
        obj.data.calc_loop_triangles(); tris+=len(obj.data.loop_triangles)
        bm=bmesh.new(); bm.from_mesh(obj.data)
        bad_edges+=sum(not e.is_manifold for e in bm.edges); bm.free()
        assert all(abs(s-1)<1e-5 for s in obj.scale),obj.name
    assert bad_edges==0,(asset.name,bad_edges)
    report['assets'][asset.name]={'triangles':tris,'meshes':len(meshes),'non_manifold_edges':bad_edges}
    report['total_triangles']+=tris
assert report['total_triangles']<10000

# Spread sources out for an editable asset-sheet view. Runtime resets root
# translations to zero and preserves their named, metre-scale child transforms.
for index,asset in enumerate(assets):
    asset.location=((index%5)*3.7-7.4,(index//5)*4.0-2,0)

from io_scene_gltf2 import get_format_items
export_format=next(item[0] for item in get_format_items(scene,bpy.context) if item[0]=='GLB')
bpy.ops.object.select_all(action=next(i.identifier for i in bpy.ops.object.select_all.get_rna_type().properties['action'].enum_items if i.identifier=='DESELECT'))
for asset in assets:
    asset.select_set(True)
    for child in asset.children_recursive:
        child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'meadow-kit.glb'),export_format=export_format,
                          use_selection=True,export_yup=True,export_animations=False,
                          export_cameras=False,export_lights=False)
report['glb_bytes']=(OUT/'meadow-kit.glb').stat().st_size
assert report['glb_bytes']<500000
(SOURCE/'asset-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')

camera_data=bpy.data.cameras.new('CAM_Asset_Review')
camera=bpy.data.objects.new('CAM_Asset_Review',camera_data)
scene.collection.objects.link(camera); camera.location=(10,-19,18)
camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type=enum(camera_data,'type','ORTHO'); camera_data.ortho_scale=21
scene.camera=camera
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.color_type=enum(area.spaces.active.shading,'color_type','VERTEX')
        area.spaces.active.region_3d.view_perspective=enum(area.spaces.active.region_3d,'view_perspective','CAMERA')
scene.render.resolution_x=1200; scene.render.resolution_y=700
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'meadow-assets.blend'))
print(json.dumps(report,indent=2))
