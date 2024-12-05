# @ap.cx/assets

<!-- 
This page is automatically generated (2024-12-05 11:29:15) by a JS script during the build process. To edit its content, modify the template located at scripts/README_template.md. Please avoid making direct changes to this generated page as they will be overwritten the next time the script is run. Instead, update the template to reflect the desired changes in the final output.  -->

This project is currently in an early stage of development and is a work in progress. It may contain incomplete features, bugs, and changes that are subject to frequent updates. We encourage contributors and users to be aware of these potential issues and to use the project with caution.

I recommend using it for testing, experimentation, or non-production purposes until further development milestones are reached. 
Your feedback and support are crucial to the project's success. 

# **ap.cx/assets**

“ap.cx/assets” is a collection of beautiful open-source fonts optimized and subsetted for modern browsers, released to facilitate web font integration.

## **Introduction**

“ap.cx/assets” offers a curated collection of high-quality, and SIL Open Font License (OFL) fonts that I love. 

The SIL Open Font License (OFL) is a free, libre and open source license specifically designed for fonts and related software based on our experience in font design and linguistic software engineering.

My main focus is to ensure a smooth integration of these fonts into web projects, optimizing them for fast and efficient delivery.

While **ap.cx/assets** is made available for general use, it has a special focus on serving fonts on my domain, AnotherPlanet.io.

## **Included Fonts**

For the moment, **ap.cx/assets** includes the following fonts:


| css_family | version |                                            subset |
| :--------- | :-----: | ------------------------------------------------: |
| Hubot Sans |  1.0.0  | latin,latin-ext,vietnamese,greek,cyrillic,symbols |


I will continue to update and expand my font library to offer more fantastic font options in the future.
Feel free to explore and utilize these fonts in your web projects, and if you have any suggestions or feedback, I'd love to hear from you.

## Subsets


## line-height

The line-height is set for font the Latin subset.

### Diacritic and accent marks in non-Latin alphabets.

Diacritics and accent marks can affect the perceived cap height and baseline of a text. Since these marks are positioned at the extremities of the font's line box, it becomes necessary to adjust the white space. One way to do this is by increasing the line-height and adding padding to the container to accommodate the additional space required. This adjustment is often necessary.


# Help Wanted!

🌍 Help Needed: Subsetting Fonts for Cyrillic, Chinese, Japanese, Korean, and More!

Hello amazing community,

As I expand the font collection, I need your expertise and assistance to create subsets for various languages.

Currently, I am looking for skilled contributors who can help us with subsetting fonts for Cyrillic, Chinese, Japanese, Korean, and other languages. Subsetting involves extracting only the necessary characters from a font to reduce file size and improve loading times, making it essential for efficient web usage.

If you have experience in typography, font engineering, or knowledge of character subsets for specific languages, we would be thrilled to have your support. Your contribution will enable users from different regions to experience beautiful typography and smooth web performance.

Whether you are fluent in Cyrillic, have a passion for Chinese characters, or understand the intricacies of Japanese and Korean writing, your expertise will be invaluable to our project.

Join Me in this global effort to enhance font accessibility and deliver an outstanding user experience to diverse audiences worldwide. 

To get involved, please reach out to me on this GitHub repository or a DM on Twitter. Let's collaborate.

# Contribute

1. Clone the repository
2. Create a python venv

From terminal:

In the project folder create a virtual environment. 
This step has to be done just once, the first time:

```
python3 -m venv venv
```

activate the virtual environment

```
source ./venv/bin/activate
```

install the required dependencies

```
pip install -r requirements.txt
```
## Variation axis

| Axis tag        | Name         | CSS Attribute       |
| --------------- | ------------ | ------------------- |
| 'ital'          | Italic       | font-style          |
| 'opsz'          | Optical size | font-optical-sizing |
| 'slnt'          | Slant        | font-style          |
| 'wdth'          | Width        | font-stretch        |
| 'wght'          | Weight       | font-weight         |



## Ressources 

### Opentype Naming Table

https://learn.microsoft.com/en-us/typography/opentype/spec/name

### OpenType Font Variations Overview

https://learn.microsoft.com/en-us/typography/opentype/spec/otvaroverview

### TrueType Reference Manual

https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cmap.html

### Capsize ❤️

Flipping how we define typography in CSS

https://seek-oss.github.io/capsize/


### Variable fonts guide

https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Fonts/Variable_Fonts_Guide

### variablefonts.io

https://variablefonts.io/about-variable-fonts/

### Glyph Metrics

https://freetype.org/freetype2/docs/glyphs/glyphs-3.html