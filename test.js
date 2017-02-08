console.log('test')
console.log('test2')
console.log('test3')

var a = ['e']
console.log(...a)

for (var i = 0; i < 10; i++) {
    console.log(i)
}

function test(h, text) {
    for (var i = 0; i < h; i++) {
        console.log(text)
    }
}

test(3, 'hi')

test(5, 'hi')

if (1 > 3) {
    console.log('impossible')
}

if (3 > 1) {
    console.log('possible')
}


if (3 > 1 && 5 < 8) {
    console.log('possible 2')
}

var c = 8 && 9
