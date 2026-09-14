package engine

// ValidateResponse represents the result of validating a configuration.
type ValidateResponse struct {
	Valid    bool      `json:"valid"`
	Errors   []Message `json:"errors"`
	Warnings []Message `json:"warnings"`
}

// Message is an error or warning message with optional line provenance.
type Message struct {
	Line    int    `json:"line,omitempty"`
	Message string `json:"message"`
}

// RouteNode represents a node in the routing tree.
type RouteNode struct {
	ID                  string       `json:"id"`
	Matchers            []string     `json:"matchers"`
	Receiver            string       `json:"receiver"`
	Continue            bool         `json:"continue"`
	GroupBy             []string     `json:"group_by"`
	GroupByAll          bool         `json:"group_by_all"`
	GroupWait           string       `json:"group_wait,omitempty"`
	GroupInterval       string       `json:"group_interval,omitempty"`
	RepeatInterval      string       `json:"repeat_interval,omitempty"`
	MuteTimeIntervals   []string     `json:"mute_time_intervals,omitempty"`
	ActiveTimeIntervals []string     `json:"active_time_intervals,omitempty"`
	Children            []*RouteNode `json:"children,omitempty"`
}

// SimulateRequest represents a request to simulate routing an alert.
type SimulateRequest struct {
	Config string            `json:"config"`
	Alert  map[string]string `json:"alert"` // map of label names to label values
}

// RouteMatch represents a route matched during simulation.
type RouteMatch struct {
	RouteID  string `json:"route_id"`
	Matched  bool   `json:"matched"`
	Continue bool   `json:"continue"`
	Terminal bool   `json:"terminal"`
}

// SimulateResponse represents the result of a simulation.
type SimulateResponse struct {
	MatchedRoutes     []RouteMatch `json:"matched_routes"`
	ReceiversNotified []string     `json:"receivers_notified"`
	Inhibited         bool         `json:"inhibited"`
	InhibitedBy       string       `json:"inhibited_by,omitempty"`
	GroupingKey       []string     `json:"grouping_key,omitempty"`
	Explanation       string       `json:"explanation"`
}
