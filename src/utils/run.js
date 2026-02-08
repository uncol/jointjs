import { readFileSync, writeFileSync } from 'fs';
import { MapConverter } from './convert.js';

const mapData = JSON.parse(readFileSync('data/input.json', 'utf8'));
const result = new MapConverter(mapData).convert();

writeFileSync('data/result-1.json', JSON.stringify(result, null, 4));

console.log(`Nodes: ${mapData.nodes.length}`);
console.log(`Links: ${mapData.links.length}`);
console.log(`Cells: ${result.cells.length}`);
