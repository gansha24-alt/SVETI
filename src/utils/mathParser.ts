// A self-contained 2D noise implementation for custom user scripts
class SimpleNoise {
  private p: Uint8Array;
  constructor() {
    this.p = new Uint8Array(256);
    // Use a fixed pseudo-random permutation table for consistency
    const permutation = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
    }
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = (this.p[X] + Y) & 255;
    const B = (this.p[(X + 1) & 255] + Y) & 255;

    // Scale output to be roughly [0, 1]
    const rawVal = this.lerp(v,
      this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
      this.lerp(u, this.grad(this.p[(A + 1) & 255], x, y - 1), this.grad(this.p[(B + 1) & 255], x - 1, y - 1))
    );
    return (rawVal + 1.0) / 2.0;
  }
}

const noiseInst = new SimpleNoise();

export interface CompiledScript {
  fn: (i: number, t: number, x: number, y: number, w: number, h: number) => [number, number, number];
  error: string | null;
}

export function compileScript(code: string): CompiledScript {
  try {
    // Replace C-style float/int variable definitions with JavaScript 'let'
    const preprocessedCode = code.replace(/\b(float|int)\s+/g, 'let ');

    // Detect assignments to channels r, g, b
    const hasAssignments = /\b(r|g|b)\s*=/.test(preprocessedCode);

    let functionBody = '';
    if (hasAssignments) {
      functionBody = `
        let r = 0, g = 0, b = 0;
        ${preprocessedCode}
        return [
          Math.max(0, Math.min(255, Math.floor(r))),
          Math.max(0, Math.min(255, Math.floor(g))),
          Math.max(0, Math.min(255, Math.floor(b)))
        ];
      `;
    } else {
      functionBody = `
        const val = Number(${preprocessedCode});
        if (isNaN(val)) return [0, 0, 0];
        const c = Math.max(0, Math.min(255, Math.floor(val)));
        return [c, c, c];
      `;
    }

    const compiled = new Function(
      'i', 't', 'x', 'y', 'w', 'h', 'noise', 'dist',
      `
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const abs = Math.abs;
        const min = Math.min;
        const max = Math.max;
        const pow = Math.pow;
        const sqrt = Math.sqrt;
        const pi = Math.PI;
        const random = Math.random;
        const fract = (v) => v - Math.floor(v);
        const floor = Math.floor;
        const ceil = Math.ceil;
        const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
        try {
          ${functionBody}
        } catch(e) {
          return [0, 0, 0];
        }
      `
    );

    // Test execution with mock values to check for runtime problems
    const testResult = compiled(0, 0, 0, 0, 1, 1, () => 0.5, () => 0);
    if (!Array.isArray(testResult) || testResult.length !== 3) {
      throw new Error('Script must return 3 color channels or a valid number.');
    }

    return {
      fn: (i, t, x, y, w, h) => {
        try {
          return compiled(
            i,
            t,
            x,
            y,
            w,
            h,
            (nx: number, ny: number) => noiseInst.noise2D(nx, ny),
            (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
          );
        } catch {
          return [0, 0, 0];
        }
      },
      error: null
    };
  } catch (err: any) {
    return {
      fn: () => [0, 0, 0],
      error: err.message || 'Syntax error'
    };
  }
}
