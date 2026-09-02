# Les vignettes d'objet

Une carte du livre = **un original**, **un fichier d'étapes**, **un script**.
Sans les trois, la moindre retouche oblige à tout refaire de mémoire.

```
objets/
  background/     le plateau, en pleine résolution et en 84x128
  frame/          le cadre seul, bord de 2 px, centre transparent
  originals/      la source brute, non retouchée, rangée par famille
  edited/         la vignette finale + son .txt d'étapes, même rangement
  scripts/        les scripts qui ont produit les vignettes
```

Les huit familles sont celles du chapitre d'équipement, en anglais :
`containers` · `liquids` · `powders` · `pastes` · `food` · `tools` · `weapons` ·
`materials`.

## Le fichier d'étapes

À côté de chaque vignette, un `.txt` du même nom. Une opération par ligne, dans
l'ordre d'application, puis la source et le script :

```
remove_background
rotate_to_pickaxe_angle(13deg)
scale_by_head_width
cap_highlights
add_grain
add_shadow
add_background
add_frame
add_grain

source: 20220712122336-jpg.jpg
script: pelle.py
```

Une image reprise telle quelle porte `none`. Une image dont l'original manque
porte `TODO`.

## Le format

**84 × 128 pixels**, soit le rapport 0,656 des vignettes d'Outward. Une source
au même rapport se pose sans recadrage ; toute autre demande un détourage.

Le cadre fait 2 px et se greffe en dernier, après le grain.

## Deux écritures de chemin dans le livre, et elles diffèrent

```
markdown   ![x](../../assets/objets/edited/famille/y.png)        deux niveaux
html brut  <img src="../../../assets/objets/edited/famille/y.png">  trois
```

Les cartes d'équipement emploient la première, les équations de fabrication la
seconde. Corriger l'une sans l'autre casse la moitié des vignettes.
