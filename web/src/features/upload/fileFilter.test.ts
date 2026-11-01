import { describe, expect, it } from 'vitest';
import { ACCEPT_ATTRIBUTE, filterFiles } from './fileFilter';

function file(name: string, size = 10): { name: string; size: number } {
  return { name, size };
}

describe('filterFiles', () => {
  it.each(['slide.svs', 'photo.png', 'photo.jpg', 'photo.jpeg'])('accepts %s', (name) => {
    const { accepted, rejected } = filterFiles([file(name)]);
    expect(accepted.map((f) => f.name)).toEqual([name]);
    expect(rejected).toEqual([]);
  });

  it.each(['SLIDE.SVS', 'Photo.PNG', 'photo.JpG', 'photo.JPEG'])(
    'accepts %s whatever its case',
    (name) => {
      expect(filterFiles([file(name)]).accepted).toHaveLength(1);
    },
  );

  it.each(['notes.txt', 'scan.tiff', 'README', 'photo.png.exe', 'photo.png.', 'png'])(
    'rejects %s for its extension',
    (name) => {
      const { accepted, rejected } = filterFiles([file(name)]);
      expect(accepted).toEqual([]);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatch(/Formato no admitido/);
    },
  );

  it('rejects empty files', () => {
    const { accepted, rejected } = filterFiles([file('empty.png', 0)]);
    expect(accepted).toEqual([]);
    expect(rejected[0]?.reason).toBe('El archivo está vacío.');
  });

  it('reports the extension before the emptiness', () => {
    expect(filterFiles([file('empty.txt', 0)]).rejected[0]?.reason).toMatch(/Formato no admitido/);
  });

  it('sets no size cap: the server decides', () => {
    expect(filterFiles([file('huge.svs', 50 * 1024 ** 3)]).accepted).toHaveLength(1);
  });

  it('rejects a repeated name inside the batch ignoring case and keeps the first', () => {
    const first = file('Slide.svs');
    const { accepted, rejected } = filterFiles([first, file('slide.SVS'), file('other.png')]);
    expect(accepted).toEqual([first, file('other.png')]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.file.name).toBe('slide.SVS');
    expect(rejected[0]?.reason).toBe('Ya elegiste un archivo con ese nombre.');
  });

  it('rejects a name that was already taken ignoring case', () => {
    const { accepted, rejected } = filterFiles([file('A.png')], ['a.PNG']);
    expect(accepted).toEqual([]);
    expect(rejected[0]?.reason).toBe('Ya elegiste un archivo con ese nombre.');
  });

  it('keeps the order and the original objects', () => {
    const a = { name: 'a.png', size: 1, tag: 'a' };
    const b = { name: 'b.txt', size: 1, tag: 'b' };
    const c = { name: 'c.jpg', size: 1, tag: 'c' };
    const { accepted, rejected } = filterFiles([a, b, c]);
    expect(accepted[0]).toBe(a);
    expect(accepted[1]).toBe(c);
    expect(rejected[0]?.file).toBe(b);
  });
});

describe('ACCEPT_ATTRIBUTE', () => {
  it('lists the allowed extensions for the file input', () => {
    expect(ACCEPT_ATTRIBUTE).toBe('.svs,.png,.jpg,.jpeg');
  });
});
