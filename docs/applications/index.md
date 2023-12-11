---
title: "Applications"
nav_order: 10
has_children: true
---
# Applications

BrightHub and other application-layer designs

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Applications'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
