---
title: "Storage System"
nav_order: 3
has_children: true
---
# Storage System

Storage pools, credits, markets, and file storage mechanics

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Storage System'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
