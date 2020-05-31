let items = [];

function createItemFromRaw(item) {
    let date = new Date(item['played_time'].split('+')[0]);
    let artists = item.recording.artists.map(o => o.name).join(', ');
    return {id: item.arid, date, artists, title: item.recording.title, duration: item.recording.duration, links: item.recording.links };
}

async function refresh() {
    let response = await fetch('requestival.json');
    let rawData = await response.json();
    items = rawData.map(createItemFromRaw);
}

// 6am to 9pm Monday-Saturday, 6am-6pm Sunday
const periods = [25, 26, 27, 28, 29, 30].map(i => [Date.UTC(2020, 4, i - 1, 20, 0, 0), Date.UTC(2020, 4, i, 11, 0, 0)])
    .concat([[Date.UTC(2020, 5, 30, 20, 0, 0), Date.UTC(2020, 5, 31, 8, 0, 0)]])
    .map(([start, end]) => [new Date(start), new Date(end)]);

async function fetchNew() {
    let url = new URL('https://music.abcradio.net.au/api/v1/plays/search.json');
    let mostRecent = items.reduce((a, b) => a.date > b.date ? a : b);

    url.searchParams.append('station','triplej');
    url.searchParams.append("limit", "100");
    url.searchParams.append("order", "asc");
    url.searchParams.append("from", mostRecent.date.toISOString());

    let response = await fetch(url);
    let rawData = await response.json();

    let existingARIDs = new Set(items.map(o => o.id))
    for (let newItem of rawData.items) {
        if(existingARIDs.has(newItem['arid'])) continue;
        items.push(createItemFromRaw(newItem));
    }

    sortList(...currentSort);

}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Australia/Sydney'
});

function formatDuration(seconds) {
    if (typeof seconds !== 'number') {
        return '';
    }
    let minutes = Math.floor(seconds / 60);
    let secs = Math.round(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
}

function populateTable() {
    let tbody = $('#requestival-songs');
    tbody.empty();

    for(let item of items) {
        // The dates aren't quite proper ISO8601, but they are definitely all UTC so just drop the timezone
        let timeString = timeFormatter.format(item.date);
        let duration = formatDuration(item.duration);
        let row = $(`<tr>
            <td><time datetime="${item.date.toISOString()}">${timeString}</td>
            <td>${item.artists}</td>
            <td><a class="track-links">${item.title}</a></td>
            <td>${duration}</td>
            </tr>`);

        if (item.links.length > 0) {
            $(row).find('.track-links')
                .attr('href', 'javascript:;')
                .attr('tabindex', '0')
                .popover({
                title: 'Links',
                placement: 'bottom',
                trigger: 'focus',
                html: true,
                content: () => {
                    let links = $('<ul/>');
                    for(let link of item.links) {
                        links.append(`<li><a href="${link.url}">${link.title}</a></li>`);
                    }
                    return links;
                }
            });
        }
        
        tbody.append(row);
    }
}

function comp(a, b) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    }
    return 0;
}

let currentSort = ['date', true];
function changeSort(evt) {
    let key = evt.target.dataset.sortkey;
    let [currentKey, desc] = currentSort;
    if (currentKey == key) {
        desc = !desc;
    } else {
        desc = false;
    }

    $('.sortable')
        .removeClass('sort-asc')
        .removeClass('sort-desc');
    
    $(`.sortable[data-sortkey=${key}]`)
        .addClass('sort-' + (desc ? 'desc' : 'asc'));

    sortList(key, desc);
}

function sortList(key, desc) {
    if (desc) {
        items.sort((a, b) => comp(b[key], a[key]));
    } else {
        items.sort((a, b) => comp(a[key], b[key]));
    }

    currentSort = [key, desc];

    populateTable();
}

function initialise() {
    refresh().then (function() {
        return fetchNew();
    }).then(function() {
        sortList(...currentSort);
        $('.sortable').on('click', changeSort);
    });



    // Fetch new songs every 10 mins
    setInterval(fetchNew, 600_000);
}