import collections
import json

lines = [json.loads(line) for line in open('restaurants.ndjson')]
category_counts = collections.Counter(c['alias'] for l in lines for c in l['categories'])

out = open('restaurants_cleaned.ndjson', 'w')

for l in lines:
    category = None
    l['categories'].sort(key=lambda c: category_counts[c['alias']], reverse=True)
    if l['categories']:
        category = l['categories'][0]
    if not l['coordinates']['latitude'] or not l['coordinates']['longitude']:
        continue
    out_line = {
        "name": l['name'],
        "alias": l['alias'],
        'imageUrl': l['image_url'],
        'neighborhood': l['neighborhood'],
        'category': category,
        'rating': l['rating'],
        'reviewCount': l['review_count'],
        'url': l['url'],
        'coordinates': l['coordinates'],
        'displayPhone': l['display_phone'],
        'displayAddress': l['location']['display_address'],
        'isClosed': l['is_closed']
    }
    if l['price'] in ('$', '$$', '$$$', '$$$$'):
        out_line['price'] = l['price']
    out.write(json.dumps(out_line))
    out.write('\n')

out.close()
