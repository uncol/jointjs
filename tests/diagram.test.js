import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { DiagramEditor } from '../src/diagram.js';

// Мокаем DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

describe('DiagramEditor', () => {
  let editor;

  beforeEach(() => {
    const container = document.getElementById('test-container');
    container.innerHTML = '';
    editor = new DiagramEditor('test-container');
  });

  it('should create instance', () => {
    expect(editor).toBeDefined();
    expect(editor.graph).toBeDefined();
    expect(editor.paper).toBeDefined();
  });

  it('should create element', () => {
    const element = editor.createElement(100, 100, 'Test');
    expect(element).toBeDefined();
    expect(element.attr('label/text')).toBe('Test');
    
    const cells = editor.graph.getCells();
    expect(cells).toHaveLength(1);
  });

  it('should create link between elements', () => {
    const el1 = editor.createElement(100, 100, 'A');
    const el2 = editor.createElement(300, 100, 'B');
    const link = editor.createLink(el1, el2);
    
    expect(link).toBeDefined();
    expect(editor.graph.getLinks()).toHaveLength(1);
  });

  it('should clear graph', () => {
    editor.createElement(100, 100);
    editor.createElement(200, 200);
    expect(editor.graph.getCells()).toHaveLength(2);
    
    editor.clear();
    expect(editor.graph.getCells()).toHaveLength(0);
  });

  it('should export and import JSON', () => {
    const el1 = editor.createElement(100, 100, 'Test');
    const json = editor.toJSON();
    
    expect(json.cells).toHaveLength(1);
    expect(json.cells[0].attrs.label.text).toBe('Test');
    
    editor.clear();
    expect(editor.graph.getCells()).toHaveLength(0);
    
    editor.fromJSON(json);
    expect(editor.graph.getCells()).toHaveLength(1);
  });

  it('should create demo diagram', () => {
    editor.createDemo();
    const cells = editor.graph.getCells();
    expect(cells.length).toBeGreaterThan(0);
    expect(editor.graph.getElements()).toHaveLength(3);
    expect(editor.graph.getLinks()).toHaveLength(2);
  });
});