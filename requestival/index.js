let items;
async function refresh() {
    let response = await fetch('requestival.json');
    let rawData = await response.json();
    items = rawData.map(item => {
        let date = new Date(item['played_time'].split('+')[0]);
        let artists = item.recording.artists.map(o => o.name).join(', ');
        return {date, artists, title: item.recording.title, duration: item.recording.duration, links: item.recording.links };
    });
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
                .attr('href', '#')
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

let currentSort = ['date', false];
function changeSort(evt) {
    let key = evt.target.dataset.sortkey;
    let [currentKey, desc] = currentSort;
    if (currentKey == key) {
        desc = !desc;
    } else {
        desc = false;
    }

    $('th.sortable')
        .removeClass('sort-asc')
        .removeClass('sort-desc');
    
    if (desc) {
        items.sort((a, b) => comp(b[key], a[key]));
        $(evt.target).addClass('sort-desc');
    } else {
        items.sort((a, b) => comp(a[key], b[key]));
        $(evt.target).addClass('sort-asc');
    }

    populateTable();

    currentSort = [key, desc];
}

function initialise() {
    refresh().then (function() {
        populateTable();
        $('th.sortable').on('click', changeSort);
    });
}