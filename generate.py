import sys
import numpy as np
import pandas as pd
import random
from apyori import apriori

inp = sys.argv[1];
split_inp = inp.split("||")
split_inp[0] = split_inp[0].split('|');
split_inp[1] = split_inp[1].split('|');

movies = split_inp[0]
users = split_inp[1]
data = []
#
for user in users:
    sett = [user]
    random.shuffle(movies);
    k = random.randint(1,len(movies))
    sett.extend(movies[0:k])
    data.append(sett);

s = '';
for d in data:
    s+='|'.join(d);
    s+='||';

s = s[:-2]

print(s);

sys.stdout.flush();
