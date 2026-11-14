# OPERATORS



| OPERATOR |DEFINITION| |
|-------|---|---|
|`$match`|Filters documents based on a specified query. |Matched documents are passed to the next pipeline stage.|
|`$unwind`|Deconstructs an array field from the input documents to output a document for each element. | Each output document is the input document with the value of the array field replaced by the element.|
|`$set` | The $set operator replaces the value of a field with the specified value.||
|`$unset`| Removes/excludes fields from documents||
| `$sort` |Sorts all input documents and returns them to the pipeline in sorted order.||
| `$ne `| selects documents where the value of the field is not equal to the specified value|this includes documents that do not contain the field.|
|`$pull`|removes from an existing array all instances of a value or values that match a specified condition||
|`$lookup`|||
## REFERENCES
- https://www.mongodb.com/docs/manual/reference/operator/query/ne/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- https://www.mongodb.com/docs/manual/reference/operator/update/pull/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/