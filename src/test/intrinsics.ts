import * as intrinsics from '../intrinsics';
import {expect} from 'chai';

describe('Intrinsics', () => {
    const {Intrinsic, BoundIntrinsic} = intrinsics;
    describe('Intrinsic class', () => {
        it('should be able to be constructed', () => {
            const TestIntrinsic = new Intrinsic('test', function (a: any) {
                return 'result';
            });
        });

        it('bind() and call() should work together', () => {
            const TestIntrinsic = new Intrinsic('test', function (a: any) {
                return a;
            });

            const arg = {};
            const boundIntrinsic = TestIntrinsic.bind(arg, [], {});
            expect(boundIntrinsic.call()).to.equal(arg);
        });

        describe('bind()', () => {
            it('should return something with a call method', () => {

                const TestIntrinsic = new Intrinsic('test', function (a: any) {
                    return a;
                });

                const result = TestIntrinsic.bind(undefined, [], {});

                expect(result).to.have.property('call');
            });

            it('should return something that is instanceof BoundIntrinsic', () => {

                const TestIntrinsic = new Intrinsic('test', function (a: any) {
                    return a;
                });

                const result = TestIntrinsic.bind(undefined, [], {});

                expect(result).to.be.instanceOf(BoundIntrinsic);
            })
        });
    })

    describe.only('Fn::Join', () => {
        const Join = intrinsics.Join;

        it('should join a basic array', () => {
            const result = Join.test(['-', ['asdf', 'fdsa']]);
            expect(result).to.deep.equal('asdf-fdsa');
        });

        it('should join with an empty delimiter', () => {
            const result = Join.test(['', ['asdf', 'fdsa']]);
            expect(result).to.deep.equal('asdffdsa');
        });

        it('should fail if the second parameter is a string', () => {
            expect(() =>
                Join.test(['', 'asdffdsa'])
            ).to.throw('Fn::Join needs its second parameter to be a list of values.');
        });

        it('should fail if it receives a longer list than 2', () => {
            expect(() =>
                Join.test(['', 'asdffdsa', 'asdf'])
            ).to.throw('Invalid parameters for Fn::Join. It needs [string, string[]].');
        });

    })

    describe('Fn::Split', () => {
        const Split = intrinsics.Split;

        it('should split a basic string', () => {
            const result = Split.test(['-', 'asdf-fdsa'])
            expect(result).to.deep.equal(['asdf', 'fdsa']);
        });

        it('should split a string that doesn\'t contain the delimiter', () => {
            const result = Split.test(['-', 'asdffdsa'])
            expect(result).to.deep.equal(['asdffdsa']);
        });

        it('should resolve an intrinsic function', () => {
            const Select = intrinsics.Select;

            const result = Split.test([
                '-',
                Select.bind([
                    1,
                    ['0-0', '1-1', '2-2']
                ], [], {})
            ])
            expect(result).to.deep.equal(['1', '1']);
        });

        it('should reject a parameter that is an object', () => {
            expect(() =>
                Split.test([{}])
            ).to.throw('Invalid parameter for Fn::Split. It needs an Array of length 2.');
        });

        it('should reject a parameter that is a string', () => {
            expect(() =>
                Split.test('split-me-plz')
            ).to.throw('Invalid parameter for Fn::Split. It needs an Array of length 2.');
        });

        it('should reject a parameter that is an empty array', () => {
            expect(() =>
                Split.test([])
            ).to.throw('Invalid parameter for Fn::Split. It needs an Array of length 2.');
        });

        it('should reject a parameter that is a single length array', () => {
            expect(() =>
                Split.test(['delim'])
            ).to.throw('Invalid parameter for Fn::Split. It needs an Array of length 2.');
        });

        it('should reject a delimiter that isn\'t a string', () => {
            expect(() =>
                Split.test([{}, 'asd-asd-asd'])
            ).to.throw('Invalid parameter for Fn::Split. The delimiter, {}, needs to be a string.');
        });
    })
})