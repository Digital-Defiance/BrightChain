---
title: "Energy Economy"
nav_order: 6
has_children: true
---
# Energy Economy

Joule-based energy tracking and economic protocol

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Energy Economy'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
