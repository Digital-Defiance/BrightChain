---
title: "Architecture & Design"
nav_order: 2
has_children: true
parent: "Home"
---
# Architecture & Design

Core architecture rules, block hierarchy, and design decisions

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Architecture & Design'" | sort: "nav_order" %}
{% for page in pages %}

- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
