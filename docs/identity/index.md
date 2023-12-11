---
title: "Identity & Keybase"
nav_order: 9
has_children: true
---
# Identity & Keybase

Paper keys, device provisioning, and identity proofs

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Identity & Keybase'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
