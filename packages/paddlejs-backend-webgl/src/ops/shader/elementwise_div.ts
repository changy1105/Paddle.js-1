/**
 * @file elementwise_div
 */

function mainFunc(
    { counter },
    { axis }
) {
    return `
    ivec4 formatNCHW(int n, int c, int h, int w) {
        int newN = n;
        int newC = c;
        int newH = h;
        int newW = w;

        if (n >= ${counter.height_texture / counter.height_shape}) {
            newN = int(${counter.height_texture / counter.height_shape});
        }
        if (c >= ${counter.channel}) {
            newC = int(${counter.channel - 1});
        }
        if (h >= ${counter.height_shape}) {
            newH = ${counter.height_shape  - 1};
        }
        if (w >= ${counter.width_shape}) {
            newW = ${counter.width_shape - 1};
        }
        return ivec4(newN, newC, newH, newW);
    }

    // start函数
    void main() {
        // 输出数据
        ivec4 oPos1 = getOutputTensorPos();
        float o = getValueFromTensorPos_origin(oPos1.r, oPos1.g, oPos1.b, oPos1.a);
        ivec4 oPos = formatNCHW(oPos1.r, oPos1.g, oPos1.b, oPos1.a);
        float c = 0.0;

        if ( ${axis} == 1) {
            c = getValueFromTensorPos_counter(0, oPos.g, oPos.b, oPos.a);
        }
        else if ( ${axis} == 2) {
            c = getValueFromTensorPos_counter(0, 0, oPos.b, oPos.a);
        }
        else if ( ${axis} == 3) {
            c = getValueFromTensorPos_counter(0, 0, 0, oPos.a);
        }
        else {
            c = getValueFromTensorPos_counter(oPos.r, oPos.g, oPos.b, oPos.a);
        }
        float res = o / c;
        setOutput(float(res));
    }
    
    `;
}
export default {
    mainFunc,
    params: [
        'axis'
    ],
    textureFuncConf: {
        counter: ['getValueFromTensorPos'],
        origin: ['getValueFromTensorPos']
    },
    behaviors: [
        'processAxis'
    ],
    inputsName: [
        'X',
        'Y'
    ]
};
