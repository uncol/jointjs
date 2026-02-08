import fs from 'fs';
const CODEPOINTS = JSON.parse(fs.readFileSync('node_modules/@gufo-labs/font/manifest.json', 'utf8'));
// Get number of nodes from command line argument, default 1000
const numNodes = parseInt(process.argv[3]) || 1000;
const type = process.argv[2] || 'image'; // image or icon

// List of icons from gufo-labs/font (subset for variety) 
// Cisco Stencils, Juniper Stencils and Huawei Stencils only
const fontIcons = [
    ...CODEPOINTS.icons['Huawei Stencils'],
    ...CODEPOINTS.icons['Cisco Stencils'],
    ...CODEPOINTS.icons['Juniper Stencils']]
    .map(i => String.fromCodePoint(i.code));
// Status icons from gufo-labs/font
const fontIconStatuses = ['gf-ok', 'gf-fail', 'gf-unknown', 'gf-war'];
// Lists of icons
const ciscoIcons = [
    'ata', 'broadband_router_d', 'cable_modem', 'cloud',
    'content_engine', 'crs', 'dslam', 'fax', 'file_server',
    'firewall', 'generic_gateway', 'generic_softswitch',
    'intelliswitch_stack', 'ip_phone', 'ip_telephony_router',
    'iptv_broadcast_server', 'layer_3_switch', 'microphone',
    'pbx', 'phone', 'pix', 'radio_tower', 'rf_modem',
    'router', 'satellite_dish', 'set_top_box', 'sip_proxy_server',
    'small_hub', 'softswitch_pgw_mgc', 'space_router',
    'standard_host', 'unversal_gateway', 'ups', 'video_camera',
    'voice_gateway', 'voice_router', 'vss', 'wireless_router',
    'workgroup_switch', 'workstation'
];

const juniperIcons = [
    'cloud', 'database', 'fcoe', 'firewall', 'generic_router',
    'l2_l3_switch', 'l2_l3_switch3'
];

const flaticonIcons = [
    'cctv-1', 'cctv-2', 'cctv-3', 'cctv-square', 'cctv-wifi',
    'hub', 'router', 'surveillance-1', 'surveillance-2',
    'surveillance-3', 'surveillance-4', 'surveillance-5',
    'web_camera'
];

const statuses = ['osUnknown', 'osUnreach', 'Down', 'Ok', 'Alarm'];

const allIcons = [
    ...ciscoIcons.map(i => ({ prefix: 'Cisco', name: i })),
    ...juniperIcons.map(i => ({ prefix: 'Juniper', name: i })),
    ...flaticonIcons.map(i => ({ prefix: 'Flaticon', name: i }))
];

// Function to convert codepoint to Unicode escape sequence
function toUnicodeEscape(codepoint) {
    if (codepoint <= 0xFFFF) {
        return `\\u${codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
    } else {
        return `\\u{${codepoint.toString(16).toUpperCase()}}`;
    }
}

// Function to generate random position
function getRandomPosition(usedPositions) {
    let x, y;
    const maxRange = Math.sqrt(numNodes) * 200; // increase range based on numNodes
    do {
        x = Math.random() * maxRange;
        y = Math.random() * maxRange;
    } while (usedPositions.some(pos => Math.abs(pos.x - x) < 100 && Math.abs(pos.y - y) < 100)); // smaller distance
    return { x, y };
}

// Function to create element
function createElement(id, icons, statuses, usedPositions, format) {
    const position = getRandomPosition(usedPositions);
    const icon = icons[Math.floor(Math.random() * icons.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    usedPositions.push(position);

    if (format === 'image') {
        return {
            type: "noc.ImageIconElement",
            id: id.toString(),
            position: position,
            attrs: {
                icon: {
                    href: `#img-${icon.prefix}-${icon.name}`,
                    status: status
                },
                title: {
                    text: `Node-${id}`
                },
                ipaddr: {
                    text: `192.168.1.${id % 255}`
                }
            }
        };
    } else if (format === 'icon') {
        return {
            type: "noc.FontIconElement",
            id: id.toString(),
            position: position,
            attrs: {
                icon: {
                    size: "gf-1x",
                    status: status,
                    text: icon
                },
                title: {
                    text: `Node-${id}`
                },
                ipaddr: {
                    text: ""
                }
            }
        };
    }
}

// Generate elements
const elements = [];
const usedPositions = [];

for (let i = 1; i <= numNodes; i++) {
    if (type === 'image') {
        elements.push(createElement(i, allIcons, statuses, usedPositions, 'image'));
    } else if (type === 'icon') {
        elements.push(createElement(i, fontIcons, fontIconStatuses, usedPositions, 'icon'));
    }
}

// Generate links: random, max 4 per node
const links = [];
const degrees = new Array(numNodes + 1).fill(0); // index 1 to numNodes

const numLinks = Math.min(numNodes * 2, 5000); // try to add up to 2 per node or 5000 max

for (let i = 0; i < numLinks; i++) {
    const source = Math.floor(Math.random() * numNodes) + 1;
    const target = Math.floor(Math.random() * numNodes) + 1;
    if (source !== target && degrees[source] < 4 && degrees[target] < 4) {
        links.push({
            type: "noc.LinkElement",
            id: `link-${i}`,
            source: { id: source.toString() },
            target: { id: target.toString() },
            attrs: {}
        });
        degrees[source]++;
        degrees[target]++;
    }
}

const data = {
    cells: [...elements, ...links]
};

fs.writeFileSync(`data/${type}-${numNodes}.json`, JSON.stringify(data, null, 4));