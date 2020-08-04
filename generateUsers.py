import random
import string
import sys

def random_char(y):
    return ''.join(random.choice(string.ascii_letters) for x in range(y))

ans=''

t = random.randint(150,350)

for i in range(1,t):
    v1 = random.randint(10,30)
    v2 = random.randint(10,30)
    v3 = random.randint(10,30)
    ans=ans+random_char(v1)+'|'+random_char(v2)+'@gmail.com|'+random_char(v3)+'||'

ans+='$$'

print(ans);
sys.stdout.flush();
