import pytest
from logic import (
    Profile,
    profile_to_sentence,
    matches_budget,
    matches_style,
    category_boost,
    build_why,
    fmt_list,
    rescale_match_scores,
    score_product,
    build_understand_summary,
)


# profile_to_sentence

def test_profile_to_sentence_includes_home_area_and_budget():
    profile = Profile(home_area="Kitchen", budget_min=100, budget_max=2000)
    sentence = profile_to_sentence(profile)
    assert "Kitchen" in sentence
    assert "£100.0 to £2000.0" in sentence


def test_profile_to_sentence_falls_back_to_room_type_when_home_area_missing():
    profile = Profile(room_type="Bathroom")
    sentence = profile_to_sentence(profile)
    assert "Bathroom" in sentence


def test_profile_to_sentence_always_ends_with_the_generic_recommend_instruction():
    sentence = profile_to_sentence(Profile())
    assert sentence.endswith("structural extras and decorative upgrades.")


# matches_budget / matches_style

@pytest.mark.parametrize("price,mn,mx,expected", [
    (500, 0, 0, True),        
    (500, 100, 1000, True), 
    (50, 100, 1000, False), 
    (1500, 100, 1000, False),
    (100, 100, 1000, True), 
    (1000, 100, 1000, True),
])
def test_matches_budget(price, mn, mx, expected):
    assert matches_budget({"price": price}, mn, mx) is expected


def test_matches_style_true_when_no_preference_given():
    assert matches_style({"style": "modern"}, "") is True


def test_matches_style_true_when_product_has_no_style_set():
    assert matches_style({}, "modern") is True


def test_matches_style_is_case_insensitive():
    assert matches_style({"style": "Modern"}, "MODERN") is True


def test_matches_style_false_on_mismatch():
    assert matches_style({"style": "classic"}, "modern") is False


# category_boost

def test_category_boost_is_zero_for_an_unrelated_product():
    profile = Profile(home_area="Kitchen")
    product = {"category": "Garden", "tags": ["outdoor"]}
    assert category_boost(product, profile) == 0


def test_category_boost_rewards_matching_home_area():
    profile = Profile(home_area="kitchen")
    product = {"category": "Kitchen Appliances", "tags": []}
    assert category_boost(product, profile) >= 8


def test_category_boost_stacks_multiple_matching_signals():
    profile = Profile(wardrobe_need="More storage", bathroom_priority="Easy clean")
    product = {"category": "wardrobe and bathroom fittings", "tags": ["wardrobe", "bathroom"]}
    boost = category_boost(product, profile)
    assert boost >= 18 


# build_why

def test_build_why_always_includes_the_baseline_reason():
    why = build_why({}, Profile(), 0.5)
    assert why[0] == "Matches the preferences you selected in the questionnaire"


def test_build_why_mentions_style_only_when_it_matches():
    profile = Profile(preferred_style="modern")
    matching_product = {"style": "modern", "category": "Kitchen"}
    why = build_why(matching_product, profile, 0.5)
    assert any("modern style preference" in w for w in why)


def test_build_why_never_returns_more_than_five_points():
    profile = Profile(
        preferred_style="modern", budget_max=5000, home_area="Kitchen", build_stage="Handover",
    )
    product = {"category": "Kitchen", "style": "modern"}
    why = build_why(product, profile, 0.5)
    assert len(why) <= 5


# fmt_list

@pytest.mark.parametrize("items,expected", [
    ([], ""),
    (["solo"], "solo"),
    (["a", "b"], "a and b"),
    (["a", "b", "c"], "a, b and c"),
    (["a", "", None, "b"], "a and b"), 
])
def test_fmt_list(items, expected):
    assert fmt_list(items) == expected


# rescale_match_scores

def test_rescale_match_scores_handles_empty_list():
    assert rescale_match_scores([]) == []


def test_rescale_match_scores_maps_the_lowest_and_highest_to_the_target_range():
    items = [{"match_score": 20}, {"match_score": 98}]
    rescale_match_scores(items, target_min=60, target_max=98)
    assert items[0]["match_score"] == 60
    assert items[1]["match_score"] == 98


def test_rescale_match_scores_gives_everything_the_max_when_all_scores_are_equal():
    items = [{"match_score": 70}, {"match_score": 70}]
    rescale_match_scores(items, target_min=60, target_max=98)
    assert items[0]["match_score"] == 98
    assert items[1]["match_score"] == 98


def test_rescale_match_scores_preserves_the_original_value_as_raw_match_score():
    items = [{"match_score": 55}]
    rescale_match_scores(items)
    assert items[0]["raw_match_score"] == 55


# score_product

def test_score_product_returns_none_when_outside_budget():
    profile = Profile(budget_min=1000, budget_max=2000)
    product = {"name": "Cheap Tap", "price": 50, "category": "Taps"}
    assert score_product(product, 0.8, profile, "sentence") is None


def test_score_product_returns_none_on_style_mismatch_when_style_is_enforced():
    profile = Profile(preferred_style="modern")
    product = {"name": "Classic Tap", "price": 50, "style": "classic", "category": "Taps"}
    assert score_product(product, 0.8, profile, "sentence", allow_style=True) is None


def test_score_product_ignores_style_mismatch_when_allow_style_is_false():
    profile = Profile(preferred_style="modern")
    product = {"name": "Classic Tap", "price": 50, "style": "classic", "category": "Taps"}
    result = score_product(product, 0.8, profile, "sentence", allow_style=False)
    assert result is not None
    assert result["match_score"] <= 88 


def test_score_product_caps_strict_matches_at_98():
    profile = Profile(
        home_area="Kitchen", wardrobe_need="x", appliance_need="x",
        bathroom_priority="x", flooring_area="x",
    )
    product = {"name": "Great Match", "price": 50, "category": "kitchen wardrobe appliance bathroom flooring"}
    result = score_product(product, 1.0, profile, "sentence")
    assert result["match_score"] == 98


def test_score_product_never_scores_below_20():
    profile = Profile()
    product = {"name": "Weak Match", "price": 50, "category": "Something Unrelated"}
    result = score_product(product, 0.0, profile, "sentence")
    assert result["match_score"] == 20


def test_score_product_carries_through_the_query_sentence_and_original_fields():
    profile = Profile()
    product = {"name": "Sofa", "price": 200, "category": "Living Room"}
    result = score_product(product, 0.5, profile, "the query sentence")
    assert result["name"] == "Sofa"
    assert result["query_sentence"] == "the query sentence"
    assert "why_points" in result


# build_understand_summary

def test_build_understand_summary_with_no_signals_uses_the_generic_message():
    result = build_understand_summary(Profile())
    assert result["summary_message"].startswith("Great! We'll find the best extras")
    assert result["detected_needs"] == []
    assert result["detected_style"] == "Any style"


def test_build_understand_summary_translates_coded_values_to_readable_text():
    profile = Profile(household_size="family_y", priorities=["durable"], upgrade_categories=["eco"])
    result = build_understand_summary(profile)
    assert "family with young children" in result["detected_needs"]
    assert "long-term durability" in result["detected_needs"]
    assert "eco and sustainability" in result["detected_needs"]


def test_build_understand_summary_falls_back_to_raw_value_for_unmapped_codes():
    profile = Profile(upgrade_categories=["totally_new_trait"])
    result = build_understand_summary(profile)
    assert "totally new trait" in result["detected_needs"]


def test_build_understand_summary_includes_budget_when_max_is_set():
    profile = Profile(budget_min=100, budget_max=5000)
    result = build_understand_summary(profile)
    assert "£100" in result["summary_message"]
    assert "£5,000" in result["summary_message"]
