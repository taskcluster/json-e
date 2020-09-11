use serde_json::Value;

/// Determine if the given value meets the JSON-e definition of "truthy"
pub(crate) fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Number(n) => n.as_f64() != Some(0f64),
        Value::Bool(b) => *b,
        Value::Null => false,
        Value::String(s) => s.len() > 0,
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
    }
}

/// Determine if the two values are equal.  This wraps Value::eq to also consider equivalent integer
/// and floating point numbers as equal
pub(crate) fn is_equal(l: &Value, r: &Value) -> bool {
    if let (Value::Number(l), Value::Number(r)) = (l, r) {
        l.as_f64() == r.as_f64()
    } else {
        l == r
    }
}