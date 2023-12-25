import {RecordType, schema} from "./static";
import {deepStrictEqual as eq} from 'assert';
import {import_lo_dash} from "./utils";
import {PhoneNumberType, PhoneNumberUtil} from 'google-libphonenumber';

const _ = import_lo_dash();
const p_util = PhoneNumberUtil.getInstance();

describe('schema', () => {
    before(() => {
        // monkey patching for json serialization
        // @ts-ignore
        BigInt.prototype.toJSON = function () {
            return this.toString()
        };
    });
    after(() => {
        // @ts-ignore
        delete BigInt.prototype.toJSON;
    });

    const _validate = async (value: RecordType | Partial<RecordType>, success: boolean) => {
        let validated, error = null;
        try {
            validated = await schema.validateAsync(value);
        } catch (e) {
            error = e;
        }
        eq(!error, success, `Expected to ${success ? 'not' : ''} fail, but got ${!error ? 'no' : ''} error`);
        if (!error) {
            const keys = Object.getOwnPropertyNames(value);
            eq(_.pick(value, keys), _.pick(validated, keys));
        }
    }
    const _it = (name: string, value: RecordType | Partial<RecordType>, success: boolean) => it(name,
        () => _validate(value, success));

    const example: RecordType = {
        name: 'me',
        phone: '+1 610 234 75 66',
        email: 'e@mail.com',
        country: 'United States',
        state: 'Florida',
        created: new Date(),
        updated: new Date(),
    };


    _it('works', example, true);
    _it('fails due to number in name', {...example, name: '1me'}, false);
    _it('fails due to letter in phone number', {...example, phone: '+555 123 45 6a'}, false);
    _it('fails due to no plus starting in phone number', {...example, phone: '555 123 45 67'}, false);
    _it('fails due to short number', {...example, phone: '+8'}, false);
    _it('fails due to long number', {...example, phone: '+555 9878 52134 78954 32187'}, false);
    _it('fails due to second +', {...example, phone: '+555 +23 45 67'}, false);

    _it('USA number w/o spaces', {
        ...example,
        country: 'United States',
        state: 'Florida',
        phone: '+16102347566',
    }, true);
    _it('USA number 2', {
        ...example,
        country: 'United States',
        state: 'Florida',
        phone: '+1 (610) 2347566',
    }, true);
    _it('USA number 3', {
        ...example,
        country: 'United States',
        state: 'Florida',
        phone: '+1 (610) 234-75-66',
    }, true);

    _it('Rus number', {
        ...example,
        country: 'Russia',
        state: 'Moscow',
        phone: '+7 916 123 45 67',
    }, true);
    _it('Rus number w/o spaces', {
        ...example,
        country: 'Russia',
        state: 'Moscow',
        phone: '+79161234567',
    }, true);
    _it('Rus number 2', {
        ...example,
        country: 'Russia',
        state: 'Moscow',
        phone: '+7 (916) 123-45-67',
    }, true);

    _it('Canada number', {
        ...example,
        country: 'Canada',
        state: 'Ontario',
        phone: '+1 (647) 555-5678',
    }, true);
    _it('Canada number', {
        ...example,
        country: 'Canada',
        state: 'Ontario',
        phone: '+1 647 555-5678',
    }, true);
    _it('Canada number', {
        ...example,
        country: 'Canada',
        state: 'Ontario',
        phone: '+16475555678',
    }, true);


    _it('Unknown country', {...example, country: 'Unknown'}, false);
    _it('Unknown state for country', {...example, country: 'Russia', state: 'Florida'}, false);
    for (let key of 'name phone email country state'.split(' ')) {
        let copy = _.omit(example, [key]);
        _it(`missing ${key} field`, copy, false);
    }
    const it_check_type = (name: string, prop_name: keyof RecordType, correct_val: any) => it(name, async () => {
        const copy = {...example};

        for (let prop of [1, true, () => {
        }, {}, 'some_string', BigInt(Number.MAX_VALUE) * BigInt(Number.MAX_VALUE), null, undefined]) {
            if (typeof prop == typeof correct_val)
                prop = correct_val; // replace as correct value

            // @ts-ignore
            copy[prop_name] = prop;
            await _validate(copy, prop == correct_val);

            const dto = Object.assign({...example}, {[prop_name]: prop});
            const json = JSON.stringify(dto);
            const parsed = JSON.parse(json) as Partial<RecordType>;
            await _validate(copy, prop == correct_val);
        }
    });
    it_check_type('checking name type', 'name', 'John');
    it_check_type('checking email type', 'email', 'e@mail.com');
    it_check_type('checking phone type', 'phone', example.phone);
    it_check_type('checking country type', 'country', 'United States');
    it_check_type('checking state type', 'state', 'Florida');


    it('phone validation', () => {
        const parsed = p_util.parse('+16102347566', 'RU')

        eq(p_util.isValidNumberForRegion(parsed, 'US'), true);
    });
});