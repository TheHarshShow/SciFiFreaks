import sys
import numpy as np
import pandas as pd
from apyori import apriori

inp = sys.argv[1];
split_inp = inp.split("//")
arr = []

for s in split_inp:
    arr.append(s.split("||"))

# print(arr)

rules = apriori(transactions = arr, min_support = 0.03, min_confidence=0.05, min_lift = 1.25, min_length=2, max_length=2)
results = list(rules)
# print(results)

# for result in results:
#     print(result)

# results = list[filter(lambda x: len(x.items) > 1, results)]
# print('helloooo '+str(list(rules)));

actual_results = []

for result in results:
    if(len(result.items)==2):
        actual_results.append(result)

# for result in actual_results:
#     print(result)

# for actual_result in actual_results:
#     print(str(actual_result.items)+" "+str(len(actual_result.items)))

lhs = [];
rhs = [];
supports = [];
confidences = [];
lifts = [];

for result in actual_results:
    if len(tuple(result[2][1][1])) == 1 and len(tuple(result[2][1][0])) == 1:
        lhs.append(tuple(result[2][1][0])[0])
        rhs.append(tuple(result[2][1][1])[0])
        supports.append(result[1])
        confidences.append(result[2][1][2])
        lifts.append(result[2][1][3])
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

# for te in temp:
#     print(te)

sys.stdout.flush()
