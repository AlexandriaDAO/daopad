use candid::Nat;

/// Format large numbers with appropriate units
pub fn format_usd(amount: f64) -> String {
    if amount >= 1_000_000.0 {
        format!("${:.2}M", amount / 1_000_000.0)
    } else if amount >= 1_000.0 {
        format!("${:.2}K", amount / 1_000.0)
    } else {
        format!("${:.2}", amount)
    }
}

/// Format token amounts with decimals
pub fn format_token_amount(amount: &Nat, decimals: u8) -> String {
    let amount_str = amount.to_string();
    let len = amount_str.len();

    if len <= decimals as usize {
        // Amount is less than 1 token
        let padding = decimals as usize - len;
        let mut result = "0.".to_string();
        for _ in 0..padding {
            result.push('0');
        }
        result.push_str(&amount_str);
        result
    } else {
        // Amount is 1 or more tokens
        let split_pos = len - decimals as usize;
        let (whole, decimal) = amount_str.split_at(split_pos);

        // Trim trailing zeros from decimal part
        let decimal_trimmed = decimal.trim_end_matches('0');

        if decimal_trimmed.is_empty() {
            whole.to_string()
        } else {
            format!("{}.{}", whole, decimal_trimmed)
        }
    }
}

/// Format percentage with appropriate precision
pub fn format_percentage(pct: f64) -> String {
    if pct.abs() < 0.01 {
        "<0.01%".to_string()
    } else if pct.abs() < 1.0 {
        format!("{:.2}%", pct)
    } else {
        format!("{:.1}%", pct)
    }
}

/// Format timestamp as human-readable duration
pub fn format_duration(nanos: u64) -> String {
    let secs = nanos / 1_000_000_000;

    if secs < 60 {
        format!("{}s", secs)
    } else if secs < 3600 {
        format!("{}m", secs / 60)
    } else if secs < 86400 {
        format!("{}h", secs / 3600)
    } else {
        format!("{}d", secs / 86400)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_usd() {
        assert_eq!(format_usd(1234567.89), "$1.23M");
        assert_eq!(format_usd(12345.67), "$12.35K");
        assert_eq!(format_usd(123.45), "$123.45");
    }

    #[test]
    fn test_format_token_amount() {
        assert_eq!(format_token_amount(&Nat::from(100000000u64), 8), "1");
        assert_eq!(format_token_amount(&Nat::from(123456789u64), 8), "1.23456789");
        assert_eq!(format_token_amount(&Nat::from(12345u64), 8), "0.00012345");
    }
}