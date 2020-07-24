import sys
import numpy as np
import pandas as pd
from apyori import apriori

inp = sys.argv[1];
split_inp = inp.split("//")
arr = []

for s in split_inp:
    arr.append(s.split("||"))


rules = apriori(transactions = arr, min_support = 1.0/3, min_confidence=0.5, min_lift = 0, min_length=2, max_length=2)
results = list(rules)
# results = list[filter(lambda x: len(x.items) > 1, results)]
# print('helloooo '+str(list(rules)));

actual_results = []

for result in results:
    if(len(result.items)==2):
        actual_results.append(result)

# for actual_result in actual_results:
#     print(str(actual_result.items)+" "+str(len(actual_result.items)))

lhs = [];
rhs = [];
supports = [];
confidences = [];
lifts = [];

for result in actual_results:
    if len(tuple(result[2][0][1])) == 1 and len(tuple(result[2][0][0])) == 1:
        lhs.append(tuple(result[2][0][0])[0])
        rhs.append(tuple(result[2][0][1])[0])
        supports.append(result[1])
        confidences.append(result[2][0][2])
        lifts.append(result[2][0][3])

def foo(elem):
    return elem[-1]

temp = list(zip(lhs,rhs,supports,confidences,lifts))
temp.sort(key=foo, reverse=True)
print(temp)

# print(inspect(actual_results))

sys.stdout.flush()
