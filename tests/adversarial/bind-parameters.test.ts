import { describe, it, expect } from 'vitest';
import sql from 'mssql';
import { bindParameters } from '../../lib/db';

describe('Empirical Adversarial Challenge: bindParameters JSON & Type Disambiguation', () => {
  it('serializes deeply nested objects to valid JSON without "[object Object]" corruption', () => {
    const req = new sql.Request();
    const deepNested = {
      level1: {
        level2: {
          level3: {
            passenger: {
              fullName: 'Đặng Quang Tùng',
              email: 'tung.dq@hust.edu.vn',
              phone: '0987654321',
              tags: ['HSSV', 'PRIORITY', 'MONTHLY'],
              metadata: {
                routeId: 'route_01_long_bien_ha_dong',
                busStops: [
                  { stopId: 1, name: 'Bến xe Yên Nghĩa', coords: { lat: 20.953, lng: 105.748 } },
                  { stopId: 5, name: 'Long Biên', coords: { lat: 21.042, lng: 105.851 } },
                ],
                notes: 'Hành lý đặc biệt: "Thùng carton 50x50" & emoji 🚌🎫⚡🇻🇳\nNewline & \t tab',
                priceDetails: { base: 200000, discount: 0.5, finalAmount: 100000 },
                active: true,
                nullField: null,
              },
            },
          },
        },
      },
    };

    bindParameters(req, { payload: deepNested });

    const param = (req.parameters as any).payload;
    expect(param).toBeDefined();
    expect(param.type).toBe(sql.NVarChar);
    expect(typeof param.value).toBe('string');
    expect(param.value).not.toContain('[object Object]');

    // Must parse back identically
    const roundtripped = JSON.parse(param.value);
    expect(roundtripped).toEqual(deepNested);
    expect(roundtripped.level1.level2.level3.passenger.fullName).toBe('Đặng Quang Tùng');
    expect(roundtripped.level1.level2.level3.passenger.metadata.notes).toBe(
      'Hành lý đặc biệt: "Thùng carton 50x50" & emoji 🚌🎫⚡🇻🇳\nNewline & \t tab'
    );
  });

  it('serializes arrays (empty, primitives, mixed, nested) to valid JSON strings', () => {
    const req = new sql.Request();
    const emptyArr: any[] = [];
    const primArr = [1, 'two', true, null, 5.67];
    const objArr = [
      { id: 't1', code: 'VIVU-2026-001', seat: null },
      { id: 't2', code: 'VIVU-2026-002', seat: 'A1' },
    ];

    bindParameters(req, {
      empty: emptyArr,
      prims: primArr,
      objs: objArr,
    });

    const pEmpty = (req.parameters as any).empty;
    const pPrims = (req.parameters as any).prims;
    const pObjs = (req.parameters as any).objs;

    expect(pEmpty.type).toBe(sql.NVarChar);
    expect(pEmpty.value).toBe('[]');
    expect(JSON.parse(pEmpty.value)).toEqual([]);

    expect(pPrims.type).toBe(sql.NVarChar);
    expect(JSON.parse(pPrims.value)).toEqual(primArr);

    expect(pObjs.type).toBe(sql.NVarChar);
    expect(JSON.parse(pObjs.value)).toEqual(objArr);
  });

  it('correctly disambiguates objects with "type" and "value" properties that are NOT SQL types', () => {
    const req = new sql.Request();

    // Adversarial inputs that contain `type` and `value` fields
    const paymentPayload = { type: 'TRANSFER', value: 100000 };
    const ticketPayload = { type: 'STANDARD_TICKET', value: 'ACTIVE' };
    const numericType = { type: 123, value: 'custom_value' };
    const nullType = { type: null, value: 'null_type_value' };
    const objType = { type: { name: 'nested_type' }, value: 999 };

    bindParameters(req, {
      payment: paymentPayload,
      ticket: ticketPayload,
      numeric: numericType,
      nullT: nullType,
      objT: objType,
    });

    // Every non-SQL type object must be serialized to JSON, NOT passed to request.input as a DataType
    const params = req.parameters as any;

    expect(params.payment.type).toBe(sql.NVarChar);
    expect(JSON.parse(params.payment.value)).toEqual(paymentPayload);

    expect(params.ticket.type).toBe(sql.NVarChar);
    expect(JSON.parse(params.ticket.value)).toEqual(ticketPayload);

    expect(params.numeric.type).toBe(sql.NVarChar);
    expect(JSON.parse(params.numeric.value)).toEqual(numericType);

    expect(params.nullT.type).toBe(sql.NVarChar);
    expect(JSON.parse(params.nullT.value)).toEqual(nullType);

    expect(params.objT.type).toBe(sql.NVarChar);
    expect(JSON.parse(params.objT.value)).toEqual(objType);
  });

  it('correctly binds genuine mssql SQL type descriptors when explicitly provided', () => {
    const req = new sql.Request();

    // Function style: sql.BigInt
    const bigIntParam = { type: sql.BigInt, value: '987654321098' };
    // Instance style: sql.NVarChar(100)
    const nvarcharParam = { type: sql.NVarChar(100), value: 'custom varchar text' };
    // Decimal style: sql.Decimal(18, 2)
    const decimalParam = { type: sql.Decimal(18, 2), value: 12345.67 };
    // VarBinary style: sql.VarBinary(sql.MAX)
    const varbinaryParam = { type: sql.VarBinary(sql.MAX), value: Buffer.from('bin_data') };

    bindParameters(req, {
      big: bigIntParam,
      txt: nvarcharParam,
      dec: decimalParam,
      bin: varbinaryParam,
    });

    const params = req.parameters as any;

    expect(params.big.type).toBe(sql.BigInt);
    expect(params.big.value).toBe('987654321098');

    expect(params.txt.type.declaration).toBe('nvarchar');
    expect(params.txt.value).toBe('custom varchar text');

    expect(params.dec.type.declaration).toBe('decimal');
    expect(params.dec.value).toBe(12345.67);

    expect(params.bin.type.declaration).toBe('varbinary');
    expect(Buffer.isBuffer(params.bin.value)).toBe(true);
  });

  it('binds Buffers directly to sql.VarBinary without string corruption', () => {
    const req = new sql.Request();
    const rawBytes = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF]);
    const emptyBuf = Buffer.alloc(0);

    bindParameters(req, {
      data: rawBytes,
      empty: emptyBuf,
    });

    const params = req.parameters as any;

    expect(params.data.type).toBe(sql.VarBinary);
    expect(Buffer.isBuffer(params.data.value)).toBe(true);
    expect(params.data.value.equals(rawBytes)).toBe(true);

    expect(params.empty.type).toBe(sql.VarBinary);
    expect(Buffer.isBuffer(params.empty.value)).toBe(true);
    expect(params.empty.value.length).toBe(0);
  });

  it('correctly binds standard primitive types (boolean, integer, decimal, Date, null, undefined)', () => {
    const req = new sql.Request();
    const now = new Date('2026-10-02T12:00:00.000Z');

    bindParameters(req, {
      boolTrue: true,
      boolFalse: false,
      intVal: 42,
      zeroVal: 0,
      negInt: -100,
      decVal: 3.14159,
      dateVal: now,
      nullVal: null,
      undefVal: undefined,
      strVal: 'Hello World',
    });

    const params = req.parameters as any;

    expect(params.boolTrue.type).toBe(sql.Bit);
    expect(params.boolTrue.value).toBe(1);

    expect(params.boolFalse.type).toBe(sql.Bit);
    expect(params.boolFalse.value).toBe(0);

    expect(params.intVal.type).toBe(sql.Int);
    expect(params.intVal.value).toBe(42);

    expect(params.zeroVal.type).toBe(sql.Int);
    expect(params.zeroVal.value).toBe(0);

    expect(params.negInt.type).toBe(sql.Int);
    expect(params.negInt.value).toBe(-100);

    expect(params.decVal.type.declaration).toBe('decimal');
    expect(params.decVal.value).toBe(3.14159);

    expect(params.dateVal.type).toBe(sql.DateTime2);
    expect(params.dateVal.value).toBe(now);

    expect(params.nullVal.type).toBe(sql.NVarChar);
    expect(params.nullVal.value).toBeNull();

    expect(params.undefVal.type).toBe(sql.NVarChar);
    expect(params.undefVal.value).toBeNull();

    expect(params.strVal.type).toBe(sql.NVarChar);
    expect(params.strVal.value).toBe('Hello World');
  });

  it('handles empty parameters or null/undefined parameters gracefully', () => {
    const req = new sql.Request();
    expect(() => bindParameters(req, undefined)).not.toThrow();
    expect(() => bindParameters(req, {})).not.toThrow();
    expect(Object.keys(req.parameters)).toHaveLength(0);
  });

  it('correctly serializes objects with toJSON() hooks', () => {
    const req = new sql.Request();
    const customObj = {
      internalSecret: 'do_not_serialize',
      publicInfo: 'safe_data',
      toJSON() {
        return { publicInfo: this.publicInfo };
      },
    };

    bindParameters(req, { custom: customObj });

    const param = (req.parameters as any).custom;
    expect(param.type).toBe(sql.NVarChar);
    const parsed = JSON.parse(param.value);
    expect(parsed).toEqual({ publicInfo: 'safe_data' });
    expect(parsed.internalSecret).toBeUndefined();
  });
});
