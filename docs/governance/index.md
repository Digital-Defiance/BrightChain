---
title: "Governance & Voting"
nav_order: 5
has_children: true
---
# Governance & Voting

BrightTrust system, voting architecture, and brokered anonymity

{% assign pages = site.pages | where_exp: "page", "page.parent == 'Governance & Voting'" | sort: "nav_order" %}
{% for page in pages %}
- [{{ page.title }}]({{ page.url | relative_url }})
{% endfor %}
