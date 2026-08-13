---
name: Nova App
description: Consola operativa offline-first, densa y coherente con Nova Web.
colors:
  nova-blue: "#002aff"
  canvas-light: "#ffffff"
  surface-light: "#f7f7f7"
  ink-light: "#252525"
  canvas-dark: "#0a0a0a"
  surface-dark: "#171717"
  ink-dark: "#fbfbfb"
  success: "#10b981"
  warning: "#f59e0b"
  destructive: "#dc2626"
  border-light: "#ebebeb"
  border-dark: "#2b2b2b"
typography:
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.nova-blue}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "8px 12px"
  input-default:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "6px 10px"
  panel-default:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: Nova App

## Overview

**Creative North Star: "Consola operativa Nova"**

Nova App se siente como una herramienta de trabajo precisa que acompaña al usuario en campo o en
oficina. La información ocupa el espacio disponible con una jerarquía tranquila: encabezados
compactos, controles consistentes y estados visibles sin ornamentación.

La adaptación desde Nova Web conserva su vocabulario visual, pero reorganiza los flujos para tacto,
pantallas estrechas y operación offline. No se agrandan indiscriminadamente tipografías ni tarjetas;
se priorizan lectura rápida, decisiones explícitas y continuidad entre tamaños de pantalla.

**Key Characteristics:**

- Densidad controlada y alineación rigurosa.
- Neutros acromáticos con un solo acento configurable.
- Estados semánticos mediante icono, texto y color.
- Componentes N-Series como vocabulario obligatorio.
- Diseño responsive estructural, no tipografía fluida.

## Colors

La paleta es neutral y restringida. El color de usuario aparece en acciones primarias, selección y
foco; no se usa como decoración.

### Primary

- **Azul Nova** (`#002aff`): acción primaria, selección y foco. Puede cambiar mediante preferencias
  manteniendo la misma función semántica.

### Neutral

- **Lienzo claro** (`#ffffff`) y **superficie clara** (`#f7f7f7`): fondo y segunda capa.
- **Lienzo oscuro** (`#0a0a0a`) y **superficie oscura** (`#171717`): equivalentes en modo oscuro.
- **Tinta clara** (`#252525`) y **tinta oscura** (`#fbfbfb`): contenido de alto contraste.
- **Bordes** (`#ebebeb`, `#2b2b2b`): separación estructural de un píxel.
- **Éxito** (`#10b981`), **advertencia** (`#f59e0b`) y **error** (`#dc2626`): estados, nunca
  decoración.

**The One Accent Rule.** El acento identifica acción primaria, foco o selección y no debe dominar
las superficies de contenido.

## Typography

**Display Font:** Poppins (system-ui fallback)  
**Body Font:** Poppins (system-ui fallback)  
**Label Font:** Poppins (system-ui fallback)

**Character:** Una sola familia mantiene continuidad entre Nova Web y Nova App. La jerarquía se
construye con peso y espacio, no con saltos exagerados de tamaño.

### Hierarchy

- **Headline** (600, 18px, 1.25): título principal de pantallas funcionales.
- **Title** (600, 14px, 1.35): paneles, grupos y entidades.
- **Body** (400, 12px, 1.5): valores, mensajes y descripciones breves.
- **Label** (600, 11px, 1.25): campos, metadatos y acciones compactas.

**The Fixed Scale Rule.** No usar tamaños fluidos según viewport. Un título funcional nunca debe
competir visualmente con el contenido que el usuario vino a operar.

## Elevation

El sistema es plano por defecto. La profundidad se comunica mediante capas tonales, bordes y estado
seleccionado. Las sombras se reservan para menús flotantes o contenido que realmente se eleva sobre
otro plano.

**The Structural Depth Rule.** Un panel permanente usa borde o fondo tonal; una sombra solo aparece
en overlays temporales.

## Components

### Buttons

- **Shape:** radio moderado de 6px y altura funcional estándar de 32px.
- **Primary:** acento configurable con texto de alto contraste; una sola acción primaria por grupo.
- **Focus / Active:** anillo de foco visible y cambio de opacidad breve.
- **Outline / Ghost:** acciones secundarias; nunca deben competir con la decisión principal.
- **Destructive:** rojo semántico únicamente para acciones destructivas confirmadas.

### Chips

- **Style:** fondo tonal o borde fino, texto de 10-11px y estado escrito.
- **State:** nunca depender solo del punto o del color para comunicar significado.

### Cards / Containers

- **Corner Style:** 8px como estándar; no superar 10px en paneles funcionales.
- **Background:** superficie neutral de segundo nivel.
- **Shadow Strategy:** sin sombra permanente.
- **Border:** un píxel de separación tonal.
- **Internal Padding:** 12px en superficies densas y 16px únicamente cuando la lectura lo exija.

### Inputs / Fields

- **Style:** 32px de altura, radio de 6px, texto de 12px y label de 11px.
- **Focus:** borde o anillo con el acento actual.
- **Error / Disabled:** texto explícito, color semántico y menor opacidad en estado deshabilitado.

### Navigation

El shell autenticado permanece visible en todas las pantallas. En móvil usa cinco destinos inferiores
estables; las rutas secundarias conservan header y tabs. El destino activo combina icono y etiqueta.

### NCrud

Compone filtros, formulario, tabla/listado, selección, ordenamiento y paginación. En móvil aplica
divulgación progresiva; cuando recibe un formulario reemplaza el listado completo.

### Conflict Comparison

Presenta el campo modificado una vez y contrapone Local y Servidor con etiquetas persistentes. Las
decisiones expresan procedencia y consecuencia; mientras se resuelve, ambas quedan deshabilitadas.
Debe usar el mismo ritmo de las filas móviles de `NCrud`: padding de 16px, separación principal de
12-20px, valores de 12-14px y acciones compactas de 40px. No comprimir simultáneamente texto, padding
y controles. Los botones de decisión deben declarar padding vertical, no depender únicamente de una
altura fija. El acceso a resolución usa una fila principal de 56px con título de 14px.

## Do's and Don'ts

### Do:

- **Do** usar componentes N-Series y alturas de 32px para formularios operativos.
- **Do** combinar icono, texto y color en sincronización, advertencias y errores.
- **Do** adaptar estructuralmente: una columna en móvil y comparación paralela cuando haya espacio.
- **Do** mantener acciones críticas cerca de la información que afectan.
- **Do** conservar el shell y el contexto de navegación en rutas secundarias.

### Don't:

- **Don't** usar títulos gigantes, espacios vacíos sin función o controles decorativos.
- **Don't** convertir una pantalla operativa en una colección de tarjetas promocionales.
- **Don't** usar gradientes, glassmorphism, bokeh u orbes decorativos.
- **Don't** depender exclusivamente del color para distinguir estados o decisiones.
- **Don't** apilar formulario y listado cuando `NCrud` debe reemplazar uno por el otro.
- **Don't** usar radios superiores a 10px en paneles funcionales.
