/**
 * @file deps
 */
export default [
    {
        func: 'transferFromNHWCtoNCHW'
    },
    {
        func: 'getOutputTensorPos'
    },
    {
        func: 'getValueFromTensorPos',
        conf: {
            TENSOR_NAME: 'origin'
        }
    }
];
