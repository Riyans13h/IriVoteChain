pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

contract Voting {
    address public admin;
    bool public electionActive;

    struct Candidate {
        string name;
        uint voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public hasVoted;

    event VoterRegistered(address voter);
    event CandidateAdded(string name);
    event Voted(address voter, uint candidateId);
    event ElectionStarted();
    event ElectionEnded();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier onlyDuringElection() {
        require(electionActive == true, "Election is not active");
        _;
    }

    constructor() public {
        admin = msg.sender;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        candidates.push(Candidate({
            name: _name,
            voteCount: 0
        }));
        emit CandidateAdded(_name);
    }

    function registerVoter(address _voter) public onlyAdmin {
        registeredVoters[_voter] = true;
        emit VoterRegistered(_voter);
    }

    function startElection() public onlyAdmin {
        electionActive = true;
        emit ElectionStarted();
    }

    function endElection() public onlyAdmin {
        electionActive = false;
        emit ElectionEnded();
    }

    function vote(uint _candidateId) public onlyDuringElection {
        require(registeredVoters[msg.sender], "Not a registered voter");
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateId < candidates.length, "Invalid candidate ID");

        candidates[_candidateId].voteCount += 1;
        hasVoted[msg.sender] = true;

        emit Voted(msg.sender, _candidateId);
    }

    function getCandidateCount() public view returns (uint) {
        return candidates.length;
    }

    function getCandidate(uint _index) public view returns (string memory, uint) {
        require(_index < candidates.length, "Invalid index");
        Candidate memory c = candidates[_index];
        return (c.name, c.voteCount);
    }

    function getResults() public view returns (string[] memory, uint[] memory) {
        uint len = candidates.length;
        string[] memory names = new string[](len);
        uint[] memory votes = new uint[](len);

        for (uint i = 0; i < len; i++) {
            names[i] = candidates[i].name;
            votes[i] = candidates[i].voteCount;
        }

        return (names, votes);
    }
}
