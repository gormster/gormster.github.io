# Yes this is ugly and bad

from datetime import datetime, timedelta
from dateutil import tz

tzinfo = tz.gettz('Australia/Sydney')

def send_request(start, end, offset):
    # cURL
    # GET https://music.abcradio.net.au/api/v1/plays/search.json
    import requests

    response = requests.get(
        url="https://music.abcradio.net.au/api/v1/plays/search.json",
        params={
            "station": "triplej",
            "from": start.isoformat(),
            "to": end.isoformat(),
            "limit": "100",
            "offset": offset,
            "order": "asc",
        }
    )

    response.raise_for_status()

    data = response.json()
    total = data['total']
    print(f'{offset} / {total}')
    return data
    

def get_days_songs(day):
    print(f'Getting day {day}')

    start = datetime(year=2020,month=5,day=day,hour=6,tzinfo=tzinfo)
    end = datetime(year=2020,month=5,day=day,hour=(21 if day < 31 else 18),tzinfo=tzinfo)

    items = []
    offset = 0
    while True:
        try:
            data = send_request(start, end, offset)
        except Exception as e:
            print(e)
            break

        if len(data['items']) == 0:
            break
        items += data['items']
        offset += len(data['items'])
        if offset > data['total']:
            break

    return items

def do_whole_festival(outfile):
    import json
    items = []

    for day in range(25,32):
        items += get_days_songs(day)

    json.dump(items, outfile)

def json_to_csv(infile, outfile):
    import json

    items = json.load(infile)

    write_to_csv(items, outfile)

def merge_items(existing, new):
    existingarids = set(i['arid'] for i in existing)
    existing.extend(i for i in new if i['arid'] not in existingarids)

def write_to_csv(items, outfile):
    import csv
    from dateutil import parser

    dw = csv.DictWriter(outfile, ['date', 'time', 'artists', 'track', 'duration'])
    dw.writeheader()

    for item in items:
        row = {}
        played_time = parser.parse(item['played_time']).astimezone(tzinfo)
        row['date'] = str(played_time.date())
        row['time'] = str(played_time.time())

        recording = item['recording']
        row['artists'] = ', '.join(artist['name'] for artist in recording['artists'])
        row['track'] = recording['title']
        if recording['duration'] is not None:
            row['duration'] = str(timedelta(seconds=recording['duration']))

        dw.writerow(row)

if __name__ == '__main__':
    import argparse
    import json
    parser = argparse.ArgumentParser(description='Update the JSON file')
    parser.add_argument('--full', type=argparse.FileType('w'))
    parser.add_argument('--day', type=int)
    parser.add_argument('--update', type=argparse.FileType('r+'))
    args = parser.parse_args()

    if args.full:
        file = args.full
        file.seek(0)
        file.truncate()
        do_whole_festival(file)
        file.close()
    elif args.update:
        file = args.update
        day = args.day or datetime.now().day
        items = json.load(file)
        new = get_days_songs(day)
        merge_items(items, new)
        file.seek(0)
        file.truncate()
        json.dump(items, file)
        file.close()
    else:
        print('Either --full or --update must be passed')

