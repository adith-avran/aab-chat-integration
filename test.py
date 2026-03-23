with open('test.txt', 'w') as f:
    f.write('helllo')
    f.write('worrld')
    f.write('hello world')


with open('test.txt', 'r') as f:
    print(repr(f.readlines()))
    print('23')